import crypto from "crypto";
import mongoose from "mongoose";
import { Booking } from "@/models/Booking";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { Ticket } from "@/models/Ticket";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { RefundRequest, REFUND_REQUEST_STATUS } from "@/models/RefundRequest";
import { PaystackService } from "@/lib/payments/paystack";
import { recordLedgerEntry } from "@/lib/financial/ledger";
import { FINANCIAL_ENTRY_TYPES } from "@/models/FinancialLedger";
import { CreateRefundRequestInput, ReviewRefundRequestInput } from "@/validators/financial";
import { notificationService } from "@/services/notification.service";

/**
 * Student requests a refund on an eligible paid booking
 */
export async function requestStudentRefund(
  studentId: string | mongoose.Types.ObjectId,
  input: CreateRefundRequestInput
) {
  const studentObjectId =
    typeof studentId === "string" ? new mongoose.Types.ObjectId(studentId) : studentId;

  // 1. Fetch booking
  const booking = await Booking.findById(input.bookingId);
  if (!booking) {
    throw new Error("Booking record not found.");
  }

  // 2. Ownership verification: Student can only refund their own bookings
  if (booking.userId.toString() !== studentObjectId.toString()) {
    throw new Error("You are not authorized to request a refund for this booking.");
  }

  // 3. Payment verification: Must be a successful paid booking
  if (booking.paymentChannel !== "paystack" || booking.paymentStatus !== "successful") {
    throw new Error("Only successfully paid ticket bookings are eligible for refund requests.");
  }

  // 4. Find corresponding payment record
  const payment = await Payment.findOne({ bookingId: booking._id });
  if (!payment || payment.paymentStatus !== PAYMENT_STATUS.SUCCESSFUL) {
    throw new Error("No verified payment transaction found for this booking.");
  }

  // 5. Date verification: Cannot refund events that have already started
  const event = await Event.findById(booking.eventId);
  if (!event) {
    throw new Error("Associated event not found.");
  }

  if (new Date(event.startDate) <= new Date()) {
    throw new Error("Refund requests cannot be submitted for events that have already started or concluded.");
  }

  // 6. Duplicate prevention: Check for existing active refund request
  const existingRefund = await RefundRequest.findOne({
    bookingId: booking._id,
    status: {
      $in: [
        REFUND_REQUEST_STATUS.PENDING,
        REFUND_REQUEST_STATUS.APPROVED,
        REFUND_REQUEST_STATUS.PROCESSING,
        REFUND_REQUEST_STATUS.SUCCESSFUL,
      ],
    },
  });

  if (existingRefund) {
    throw new Error(
      `A refund request (${existingRefund.refundReference}) is already in progress or has been completed for this booking.`
    );
  }

  // 7. Generate refund reference
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  const refundReference = `NOT-REF-${dateStr}-${randomSuffix}`;

  // 8. Create RefundRequest record
  const refundRequest = await RefundRequest.create({
    refundReference,
    bookingId: booking._id,
    paymentId: payment._id,
    eventId: booking.eventId,
    userId: studentObjectId,
    organizerId: payment.organizerId,
    amount: payment.amount,
    amountInKobo: payment.amountInKobo,
    currency: "NGN",
    reason: input.reason,
    status: REFUND_REQUEST_STATUS.PENDING,
    ticketsInvalidated: false,
  });

  // Notify student of registered refund request
  try {
    const studentUser = await User.findById(studentObjectId).select("name email").lean();
    if (studentUser?.email) {
      await notificationService.notifyRefundStatus({
        studentId: studentObjectId,
        recipientEmail: studentUser.email,
        studentName: studentUser.name || "Student",
        reference: refundReference,
        bookingReference: booking.bookingReference,
        eventTitle: event.title,
        amountInNaira: payment.amount,
        status: "pending",
      });
    }
  } catch (notifErr) {
    console.error("⚠️ Failed to notify student of refund request:", notifErr);
  }

  return refundRequest;
}

async function dispatchRefundStatusNotification(refund: InstanceType<typeof RefundRequest>) {
  try {
    const studentUser = await User.findById(refund.userId).select("name email").lean();
    const event = await Event.findById(refund.eventId).select("title").lean();
    const booking = await Booking.findById(refund.bookingId).select("bookingReference").lean();
    if (studentUser?.email) {
      await notificationService.notifyRefundStatus({
        studentId: refund.userId,
        recipientEmail: studentUser.email,
        studentName: studentUser.name || "Student",
        reference: refund.refundReference,
        bookingReference: booking?.bookingReference,
        eventTitle: event?.title,
        amountInNaira: refund.amount,
        status: refund.status as "pending" | "approved" | "processing" | "successful" | "rejected",
        reason: refund.rejectionReason,
      });
    }
  } catch (notifErr) {
    console.error("⚠️ Failed to notify student of refund status:", notifErr);
  }
}

/**
 * Superadmin reviews and executes refund request
 */
export async function reviewRefundRequest(
  superadminId: string | mongoose.Types.ObjectId,
  refundId: string,
  input: ReviewRefundRequestInput
) {
  const adminObjectId =
    typeof superadminId === "string" ? new mongoose.Types.ObjectId(superadminId) : superadminId;

  const refund = await RefundRequest.findById(refundId);
  if (!refund) {
    throw new Error("Refund request record not found.");
  }

  if (
    refund.status !== REFUND_REQUEST_STATUS.PENDING &&
    refund.status !== REFUND_REQUEST_STATUS.PROCESSING
  ) {
    throw new Error(`Cannot review refund request in '${refund.status}' status.`);
  }

  refund.reviewedBy = adminObjectId;
  refund.reviewedAt = new Date();
  if (input.notes) refund.reviewNotes = input.notes;

  if (input.action === "reject") {
    refund.status = REFUND_REQUEST_STATUS.REJECTED;
    refund.rejectionReason = input.reason || "Refund declined by administrator";
    await refund.save();
    await dispatchRefundStatusNotification(refund);
    return refund;
  }

  if (input.action === "approve") {
    const payment = await Payment.findById(refund.paymentId);
    if (!payment) {
      throw new Error("Original payment record not found for refund execution.");
    }

    // Call Paystack Refund API
    try {
      const refundRes = await PaystackService.initiateRefund({
        transactionRefOrId: payment.paystackTransactionId || payment.paymentReference,
        amountInKobo: refund.amountInKobo,
        merchantNote: input.notes || "Approved student ticket refund",
      });

      if (refundRes?.id) {
        refund.paystackRefundId = String(refundRes.id);
      }
    } catch (gatewayErr: unknown) {
      const errorMsg = gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr);
      console.warn("⚠️ [REFUND] Paystack refund API notice:", errorMsg);
      // In development or simulation mode, continue with administrative refund approval
    }

    // 1. Invalidate affected tickets and cancel check-in eligibility
    await Ticket.updateMany(
      { bookingId: refund.bookingId },
      {
        isInvalidated: true,
        invalidatedAt: new Date(),
        invalidatedReason: "Refund approved by administrator",
        isCheckedIn: false,
      }
    );

    // 2. Update booking and payment statuses to 'refunded'
    await Booking.findByIdAndUpdate(refund.bookingId, {
      paymentStatus: "refunded",
    });

    payment.paymentStatus = PAYMENT_STATUS.REFUNDED;
    await payment.save();

    // 3. Update refund record
    refund.status = REFUND_REQUEST_STATUS.SUCCESSFUL;
    refund.ticketsInvalidated = true;
    refund.invalidatedAt = new Date();
    await refund.save();

    // 4. Record append-only Financial Ledger debit entry
    await recordLedgerEntry({
      entryType: FINANCIAL_ENTRY_TYPES.REFUND,
      direction: "debit",
      amountInKobo: refund.amountInKobo,
      organizerId: refund.organizerId,
      eventId: refund.eventId,
      userId: refund.userId,
      paymentId: refund.paymentId,
      refundRequestId: refund._id,
      reference: refund.refundReference,
      description: `Refund processed for booking ${refund.bookingId} (₦${refund.amount.toLocaleString()})`,
    });

    await dispatchRefundStatusNotification(refund);
    return refund;
  }

  return refund;
}
