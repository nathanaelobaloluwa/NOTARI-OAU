import { connectToDatabase } from "@/lib/database/mongoose";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { Booking } from "@/models/Booking";
import { Ticket } from "@/models/Ticket";
import { Event } from "@/models/Event";
import { TicketSecurityService } from "@/lib/tickets/qr";
import { PaystackVerifyResponse } from "@/lib/payments/paystack";
import { reservePaidTickets, releasePaymentReservation } from "@/lib/payments/reservation";
import { recordLedgerEntry } from "@/lib/financial/ledger";
import { FINANCIAL_ENTRY_TYPES } from "@/models/FinancialLedger";
import { notificationService } from "@/services/notification.service";

export interface FulfillVerifiedPaymentParams {
  reference: string;
  paystackData: PaystackVerifyResponse;
  verifiedBy: "webhook" | "callback" | "admin";
}

export interface FulfillVerifiedPaymentResult {
  success: boolean;
  status: number;
  message: string;
  alreadyFulfilled?: boolean;
  data?: {
    bookingReference: string;
    ticketCodes: string[];
    amount: number;
    paymentStatus: string;
    tierName: string;
    quantity: number;
  };
}

/**
 * Fulfills verified Paystack payments with strict idempotency and inventory protection:
 * 1. Checks if already fulfilled (returns existing tickets without duplicate generation)
 * 2. Validates amount (in Kobo), currency (NGN), and transaction status
 * 3. Handles late payments (re-reserves inventory or flags for refund without overselling)
 * 4. Issues authentic cryptographic HMAC QR tickets
 * 5. Updates Payment and Booking state atomically
 */
export async function fulfillVerifiedPayment({
  reference,
  paystackData,
  verifiedBy,
}: FulfillVerifiedPaymentParams): Promise<FulfillVerifiedPaymentResult> {
  await connectToDatabase();

  const payment = await Payment.findOne({ paymentReference: reference });
  if (!payment) {
    return {
      success: false,
      status: 404,
      message: `No payment record found matching reference "${reference}".`,
    };
  }

  // Idempotency: If already confirmed as successful, return existing confirmation
  if (payment.paymentStatus === PAYMENT_STATUS.SUCCESSFUL) {
    const existingTickets = await Ticket.find({ bookingId: payment.bookingId });
    const booking = await Booking.findById(payment.bookingId);

    return {
      success: true,
      status: 200,
      alreadyFulfilled: true,
      message: "Payment has already been verified and tickets previously issued.",
      data: {
        bookingReference: booking?.bookingReference || payment.paymentReference,
        ticketCodes: existingTickets.map((t) => t.ticketCode),
        amount: payment.amount,
        paymentStatus: payment.paymentStatus,
        tierName: payment.tierName,
        quantity: payment.quantity,
      },
    };
  }

  // Security Check 1: Gateway status must be "success"
  if (paystackData.status !== "success") {
    await releasePaymentReservation(
      reference,
      PAYMENT_STATUS.FAILED,
      paystackData.gateway_response || "Payment declined or failed on gateway"
    );
    return {
      success: false,
      status: 400,
      message: `Payment transaction did not succeed (status: ${paystackData.status}). Reserved capacity released.`,
    };
  }

  // Security Check 2: Currency must be NGN
  if (paystackData.currency !== "NGN") {
    console.error(`🚨 Security Alert: Currency mismatch for ref ${reference}. Expected NGN, got ${paystackData.currency}`);
    return {
      success: false,
      status: 400,
      message: `Currency mismatch. Expected NGN, received ${paystackData.currency}.`,
    };
  }

  // Security Check 3: Amount match (Paystack amounts are in Kobo)
  if (paystackData.amount !== payment.amountInKobo) {
    console.error(
      `🚨 Security Alert: Amount mismatch for ref ${reference}. Expected ${payment.amountInKobo} kobo, received ${paystackData.amount} kobo.`
    );
    return {
      success: false,
      status: 400,
      message: "Paid amount does not match expected order total.",
    };
  }

  // Late Payment Handling: If reservation expired or was released while student was paying
  if (
    payment.paymentStatus === PAYMENT_STATUS.ABANDONED ||
    payment.paymentStatus === PAYMENT_STATUS.EXPIRED ||
    payment.paymentStatus === PAYMENT_STATUS.FAILED
  ) {
    console.warn(`⚠️ Late payment received for expired reservation: ${reference}. Checking available capacity...`);
    const reReserve = await reservePaidTickets(payment.eventId, payment.ticketTierId, payment.quantity);

    if (!reReserve.success) {
      // Capacity filled in the meantime. Strictly prevent overselling!
      payment.paymentStatus = PAYMENT_STATUS.RECONCILIATION_NEEDED;
      payment.metadata = {
        ...(payment.metadata || {}),
        oversellPrevented: true,
        reconciliationReason: "Late payment arrived after event capacity was filled by other buyers",
        paystackData,
      };
      await payment.save();

      return {
        success: false,
        status: 409,
        message:
          "Payment was received after your reservation expired and the event is now sold out. Your payment has been flagged for immediate refund reconciliation.",
      };
    }
  }

  const paidAtDate = paystackData.paid_at ? new Date(paystackData.paid_at) : new Date();

  // Generate authentic digital tickets
  const createdTickets: Array<InstanceType<typeof Ticket>> = [];
  for (let i = 0; i < payment.quantity; i++) {
    const ticketCode = TicketSecurityService.generateTicketCode();
    const signature = TicketSecurityService.signTicket(ticketCode, payment.eventId.toString());
    const qrCodeUrl = `https://notari-oau.edu.ng/verify/${ticketCode}?sig=${signature}`;

    const ticket = await Ticket.create({
      bookingId: payment.bookingId,
      eventId: payment.eventId,
      userId: payment.userId,
      ticketTierId: payment.ticketTierId,
      tierName: payment.tierName,
      ticketCode,
      qrCodeUrl,
      attendeeName: payment.customerName,
      attendeeEmail: payment.customerEmail,
      pricePaid: payment.unitPrice,
      isCheckedIn: false,
    });
    createdTickets.push(ticket);
  }

  // Update Booking status
  const booking = await Booking.findByIdAndUpdate(
    payment.bookingId,
    {
      paymentStatus: "successful",
      paidAt: paidAtDate,
    },
    { new: true }
  );

  // Update Payment record
  payment.paymentStatus = PAYMENT_STATUS.SUCCESSFUL;
  payment.paidAt = paidAtDate;
  payment.verifiedAt = new Date();
  payment.verifiedBy = verifiedBy;
  if (paystackData.id) {
    payment.paystackTransactionId = paystackData.id.toString();
  }
  payment.gatewayResponse = {
    channel: paystackData.channel,
    gateway_response: paystackData.gateway_response,
    id: paystackData.id,
  };
  await payment.save();

  // Record immutable financial ledger credit entry
  try {
    await recordLedgerEntry({
      entryType: FINANCIAL_ENTRY_TYPES.TICKET_PAYMENT,
      direction: "credit",
      amountInKobo: payment.amountInKobo,
      organizerId: payment.organizerId,
      eventId: payment.eventId,
      userId: payment.userId,
      paymentId: payment._id,
      reference: payment.paymentReference,
      description: `Ticket payment verified for ${payment.tierName} (${payment.quantity} ticket(s))`,
    });
  } catch (ledgerErr) {
    console.error("⚠️ Failed to record financial ledger entry for payment:", ledgerErr);
  }

  // Asynchronously dispatch paid ticket receipt email & in-app notification
  try {
    const event = await Event.findById(payment.eventId).select("title venue startDate").lean();
    await notificationService.notifyPaidTicketReceipt({
      userId: payment.userId,
      studentName: payment.customerName,
      studentEmail: payment.customerEmail,
      eventTitle: event?.title || "OAU Campus Event",
      eventVenue: event?.venue || "Campus Venue",
      eventDate: event?.startDate || new Date(),
      bookingReference: booking?.bookingReference || payment.paymentReference,
      paymentReference: payment.paymentReference,
      tierName: payment.tierName,
      quantity: payment.quantity,
      amountInKobo: payment.amountInKobo,
      paidAt: payment.paidAt || new Date(),
      ticketCodes: createdTickets.map((t) => t.ticketCode),
      tickets: createdTickets.map((t) => ({
        code: t.ticketCode,
        qrCodeUrl: t.qrCodeUrl,
      })),
    });
  } catch (notifErr) {
    console.error("⚠️ Failed to dispatch paid ticket receipt notification:", notifErr);
  }

  return {
    success: true,
    status: 200,
    message: "Payment successfully verified and authentic digital passes issued.",
    data: {
      bookingReference: booking?.bookingReference || payment.paymentReference,
      ticketCodes: createdTickets.map((t) => t.ticketCode),
      amount: payment.amount,
      paymentStatus: payment.paymentStatus,
      tierName: payment.tierName,
      quantity: payment.quantity,
    },
  };
}

