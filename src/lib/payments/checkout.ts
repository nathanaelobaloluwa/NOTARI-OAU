import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { Booking } from "@/models/Booking";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { EVENT_STATUS } from "@/constants/oau";
import { generateBookingReference } from "@/validators/booking";
import { generatePaymentReference } from "@/validators/payment";
import { PaystackService } from "@/lib/payments/paystack";
import {
  reservePaidTickets,
  releasePaymentReservation,
  releaseExpiredReservations,
  RESERVATION_EXPIRY_MINUTES,
} from "@/lib/payments/reservation";
import { env } from "@/config/env";

export interface ProcessPaidCheckoutParams {
  userId: string;
  userEmail: string;
  userName: string;
  eventId: string;
  ticketTierId: string;
  quantity: number;
  callbackUrl?: string;
}

export interface ProcessPaidCheckoutResult {
  success: boolean;
  status: number;
  message: string;
  data?: {
    authorizationUrl: string;
    accessCode: string;
    paymentReference: string;
    bookingReference: string;
    amount: number;
    amountInKobo: number;
    currency: string;
    reservedUntil: string;
  };
}

/**
 * Handles paid ticket checkout initialization:
 * 1. Validates published event and paid tier
 * 2. Enforces max per order constraints
 * 3. Sweeps expired reservations
 * 4. Atomically reserves ticket inventory
 * 5. Creates pending Booking and Payment records
 * 6. Initializes Paystack transaction server-side
 */
export async function processPaidCheckoutInitialization({
  userId,
  userEmail,
  userName,
  eventId,
  ticketTierId,
  quantity,
  callbackUrl,
}: ProcessPaidCheckoutParams): Promise<ProcessPaidCheckoutResult> {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return { success: false, status: 400, message: "Invalid event ID format." };
  }
  if (!mongoose.Types.ObjectId.isValid(ticketTierId)) {
    return { success: false, status: 400, message: "Invalid ticket tier ID format." };
  }

  await connectToDatabase();

  // Periodically release expired pending reservations
  try {
    await releaseExpiredReservations();
  } catch (err) {
    console.warn("⚠️ Expired reservations sweep warning:", err);
  }

  const event = await Event.findById(eventId);
  if (!event || event.status !== EVENT_STATUS.PUBLISHED) {
    return {
      success: false,
      status: 404,
      message: "Event not found or not published for ticket purchases.",
    };
  }

  const targetTier = event.ticketTiers.find(
    (t) => t._id && t._id.toString() === ticketTierId
  );

  if (!targetTier || !targetTier._id) {
    return {
      success: false,
      status: 400,
      message: "Selected ticket tier does not exist on this event.",
    };
  }

  const tierId = targetTier._id;

  // Reject free tickets from paid checkout
  if (targetTier.price === 0) {
    return {
      success: false,
      status: 400,
      message: "This is a free admission tier. Please use the free ticket reservation flow.",
    };
  }

  // Sales window validation
  const now = new Date();
  if (targetTier.salesStartDate && new Date(targetTier.salesStartDate) > now) {
    return {
      success: false,
      status: 400,
      message: "Ticket sales for this tier have not yet opened.",
    };
  }
  if (targetTier.salesEndDate && new Date(targetTier.salesEndDate) < now) {
    return {
      success: false,
      status: 400,
      message: "Ticket sales for this tier have ended.",
    };
  }

  const maxPerOrder = targetTier.maxPerOrder || 5;
  if (quantity > maxPerOrder) {
    return {
      success: false,
      status: 400,
      message: `You cannot purchase more than ${maxPerOrder} ticket(s) per order.`,
    };
  }

  // Check student's existing active and successful bookings
  const existingBookings = await Booking.find({
    userId: new mongoose.Types.ObjectId(userId),
    eventId: event._id,
    ticketTierId: tierId,
    paymentStatus: { $in: ["successful", "pending"] },
  });

  const alreadyBooked = existingBookings.reduce((sum, b) => sum + b.quantity, 0);
  if (alreadyBooked + quantity > maxPerOrder) {
    return {
      success: false,
      status: 400,
      message: `You have already reserved/purchased ${alreadyBooked} ticket(s) for this tier. Maximum allowed per student is ${maxPerOrder}.`,
    };
  }

  // Step 1: Atomically reserve inventory capacity
  const reservation = await reservePaidTickets(event._id, tierId, quantity);
  if (!reservation.success) {
    return {
      success: false,
      status: 409,
      message: reservation.error || "Sorry, this ticket tier is sold out or insufficient spots remain.",
    };
  }

  // Step 2: Calculate pricing directly from MongoDB (never trust client)
  const unitPrice = targetTier.price;
  const totalAmount = unitPrice * quantity; // in NGN
  const amountInKobo = PaystackService.toKobo(totalAmount);
  const bookingReference = generateBookingReference();
  const paymentReference = generatePaymentReference();
  const reservedUntil = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);

  let bookingDoc: InstanceType<typeof Booking> | null = null;

  try {
    bookingDoc = await Booking.create({
      bookingReference,
      userId: new mongoose.Types.ObjectId(userId),
      eventId: event._id,
      organizerId: event.organizerId,
      ticketTierId: tierId,
      quantity,
      unitPrice,
      totalAmount,
      paymentStatus: "pending",
      paymentReference,
      paymentChannel: "paystack",
      reservedUntil,
    });

    await Payment.create({
      userId: new mongoose.Types.ObjectId(userId),
      eventId: event._id,
      bookingId: bookingDoc._id,
      organizerId: event.organizerId,
      ticketTierId: tierId,
      tierName: targetTier.name,
      quantity,
      unitPrice,
      amount: totalAmount,
      amountInKobo,
      currency: "NGN",
      paymentReference,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentChannel: "paystack",
      reservedUntil,
      customerEmail: userEmail,
      customerName: userName,
      metadata: {
        bookingReference,
        eventId: event._id.toString(),
        eventTitle: event.title,
        ticketTierId: tierId.toString(),
        tierName: targetTier.name,
      },
    });

    // Step 3: Initialize Paystack transaction server-side
    const effectiveCallbackUrl =
      callbackUrl ||
      env.PAYSTACK_CALLBACK_URL ||
      `${env.NEXT_PUBLIC_APP_URL}/payment/verify`;

    const paystackRes = await PaystackService.initializeTransaction({
      email: userEmail,
      amount: totalAmount,
      reference: paymentReference,
      callbackUrl: effectiveCallbackUrl,
      metadata: {
        paymentReference,
        bookingReference,
        eventId: event._id.toString(),
        ticketTierId: tierId.toString(),
        quantity,
        userId,
      },
    });

    return {
      success: true,
      status: 200,
      message: "Payment transaction initialized successfully.",
      data: {
        authorizationUrl: paystackRes.authorization_url,
        accessCode: paystackRes.access_code,
        paymentReference,
        bookingReference,
        amount: totalAmount,
        amountInKobo,
        currency: "NGN",
        reservedUntil: reservedUntil.toISOString(),
      },
    };
  } catch (err: unknown) {
    console.error("❌ Failed to initialize Paystack checkout:", err);

    // Rollback inventory reservation on initialization failure
    await releasePaymentReservation(paymentReference, PAYMENT_STATUS.FAILED, "Initialization error rollback");

    return {
      success: false,
      status: 502,
      message: (err as Error).message || "Failed to initialize payment gateway. Please try again.",
    };
  }
}
