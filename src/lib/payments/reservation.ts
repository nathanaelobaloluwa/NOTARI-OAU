import mongoose from "mongoose";
import { Event } from "@/models/Event";
import { Payment, PAYMENT_STATUS, PaymentStatus } from "@/models/Payment";
import { Booking } from "@/models/Booking";
import { EVENT_STATUS } from "@/constants/oau";

export const RESERVATION_EXPIRY_MINUTES = 15;

/**
 * Atomically reserves inventory spots for a pending paid ticket purchase.
 * Guarantees no overselling via atomic conditional decrement ($gte quantity).
 */
export async function reservePaidTickets(
  eventId: string | mongoose.Types.ObjectId,
  ticketTierId: string | mongoose.Types.ObjectId,
  quantity: number
): Promise<{ success: boolean; event?: InstanceType<typeof Event>; error?: string }> {
  const eventObjectId = new mongoose.Types.ObjectId(eventId.toString());
  const tierObjectId = new mongoose.Types.ObjectId(ticketTierId.toString());

  const updatedEvent = await Event.findOneAndUpdate(
    {
      _id: eventObjectId,
      status: EVENT_STATUS.PUBLISHED,
      "ticketTiers._id": tierObjectId,
      "ticketTiers.available": { $gte: quantity },
    },
    {
      $inc: {
        registeredCount: quantity,
        "ticketTiers.$.available": -quantity,
      },
    },
    { new: true }
  );

  if (!updatedEvent) {
    return {
      success: false,
      error: "Sorry, this ticket tier is sold out or insufficient spots remain.",
    };
  }

  return { success: true, event: updatedEvent };
}

/**
 * Atomically releases reserved spots back to the event capacity.
 * Used when a payment fails, is cancelled, or is abandoned.
 */
export async function releasePaymentReservation(
  paymentReference: string,
  newStatus: PaymentStatus = PAYMENT_STATUS.ABANDONED,
  reason = "Checkout expired or cancelled"
): Promise<{ success: boolean; released: boolean; message: string }> {
  const payment = await Payment.findOne({ paymentReference });
  if (!payment) {
    return { success: false, released: false, message: "Payment record not found." };
  }

  // Only release capacity if payment is currently pending or processing
  if (payment.paymentStatus !== PAYMENT_STATUS.PENDING && payment.paymentStatus !== PAYMENT_STATUS.PROCESSING) {
    return {
      success: true,
      released: false,
      message: `Payment already in '${payment.paymentStatus}' state; inventory not released.`,
    };
  }

  // Restore inventory capacity atomically
  await Event.findOneAndUpdate(
    {
      _id: payment.eventId,
      "ticketTiers._id": payment.ticketTierId,
    },
    {
      $inc: {
        registeredCount: -payment.quantity,
        "ticketTiers.$.available": payment.quantity,
      },
    }
  );

  // Update Payment & Booking status
  payment.paymentStatus = newStatus;
  payment.metadata = {
    ...(payment.metadata || {}),
    releaseReason: reason,
    releasedAt: new Date().toISOString(),
  };
  await payment.save();

  await Booking.findOneAndUpdate(
    { _id: payment.bookingId },
    { paymentStatus: "failed" }
  );

  return {
    success: true,
    released: true,
    message: `Released ${payment.quantity} reserved ticket(s) back to event inventory.`,
  };
}

/**
 * Sweeps and releases all expired ticket reservations across the platform.
 * Ensures abandoned checkouts do not lock seats indefinitely.
 */
export async function releaseExpiredReservations(): Promise<{ releasedCount: number }> {
  const now = new Date();
  const expiredPayments = await Payment.find({
    paymentStatus: PAYMENT_STATUS.PENDING,
    reservedUntil: { $lt: now },
  }).limit(50);

  let releasedCount = 0;
  for (const payment of expiredPayments) {
    const result = await releasePaymentReservation(
      payment.paymentReference,
      PAYMENT_STATUS.ABANDONED,
      "Reservation expired past 15-minute window"
    );
    if (result.released) {
      releasedCount++;
    }
  }

  return { releasedCount };
}

