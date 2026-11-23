import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { EmailDelivery, EmailRelatedType, EmailDeliveryStatus, IEmailDeliveryDocument } from "@/models/EmailDelivery";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { sendEmail } from "@/lib/email/client";
import {
  renderFreeTicketEmail,
  renderPaidTicketReceiptEmail,
  TicketSummaryInfo,
} from "@/lib/email/templates/ticket-templates";
import {
  renderOrganizerAppSubmittedEmail,
  renderOrganizerAppApprovedEmail,
  renderOrganizerAppRejectedEmail,
  renderOrganizerChangesRequestedEmail,
  renderEventSubmittedEmail,
  renderEventApprovedEmail,
  renderEventRejectedEmail,
  renderPayoutStatusEmail,
} from "@/lib/email/templates/organizer-templates";
import { renderRefundStatusEmail } from "@/lib/email/templates/refund-templates";
import { renderEventReminderEmail } from "@/lib/email/templates/reminder-templates";
import {
  renderCampusAnnouncementEmail,
  renderOrganizerEventBroadcastEmail,
} from "@/lib/email/templates/announcement-templates";
import { User } from "@/models/User";

export interface NotificationResult {
  success: boolean;
  delivered: boolean;
  provider: "simulated" | "resend" | "mock";
  recipient: string;
  subject: string;
  timestamp: string;
  alreadyDelivered?: boolean;
  error?: string;
}

function isNonRetryableError(errorMsg?: string): boolean {
  if (!errorMsg) return false;
  const msg = errorMsg.toLowerCase();
  return (
    msg.includes("invalid email") ||
    msg.includes("syntax error") ||
    msg.includes("mailbox unavailable") ||
    msg.includes("does not exist") ||
    msg.includes("blacklisted") ||
    msg.includes("suppressed") ||
    msg.includes("unsubscribed") ||
    msg.includes("domain not found") ||
    msg.includes("recipient rejected")
  );
}

class NotificationService {
  /**
   * Safe email dispatch helper with outbox tracking, idempotency, and error isolation.
   * Catches all delivery exceptions so an email failure NEVER interrupts or reverses business operations.
   */
  private async dispatchEmailWithAudit(params: {
    recipient: string;
    userId?: string | mongoose.Types.ObjectId;
    subject: string;
    html: string;
    text: string;
    template: string;
    relatedType?: EmailRelatedType;
    relatedId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationResult> {
    const timestamp = new Date().toISOString();
    const recipient = params.recipient.trim().toLowerCase();

    try {
      await connectToDatabase();

      const userObjectId =
        params.userId && mongoose.Types.ObjectId.isValid(params.userId)
          ? new mongoose.Types.ObjectId(params.userId)
          : undefined;

      const idempotencyKey =
        params.relatedId && params.relatedType
          ? `${recipient}:${params.relatedType}:${params.relatedId}:${params.template}`
          : undefined;

      // 1. Idempotency Check: prevent duplicate emails from webhook retries or parallel dispatches
      if (idempotencyKey) {
        const existing = await EmailDelivery.findOne({
          $or: [
            { idempotencyKey },
            {
              recipient,
              relatedType: params.relatedType,
              relatedId: params.relatedId,
              template: params.template,
            },
          ],
        });

        if (
          existing &&
          ["sent", "accepted", "delivered", "simulated"].includes(existing.status)
        ) {
          console.log(
            `ℹ️ [EMAIL_IDEMPOTENCY] Email already sent to ${recipient} for ${params.template} (${params.relatedId}). Skipping duplicate dispatch.`
          );
          return {
            success: true,
            delivered: true,
            alreadyDelivered: true,
            provider: existing.provider,
            recipient,
            subject: params.subject,
            timestamp,
          };
        }
      }

      // 2. Create pending outbox audit record protected by unique idempotency key
      let deliveryRecord: IEmailDeliveryDocument;
      try {
        deliveryRecord = await EmailDelivery.create({
          recipient,
          userId: userObjectId,
          subject: params.subject,
          template: params.template,
          status: "pending",
          provider: "simulated",
          idempotencyKey,
          relatedType: params.relatedType || "system",
          relatedId: params.relatedId,
          metadata: {
            ...params.metadata,
            html: params.html,
            text: params.text,
          },
          lastAttemptAt: new Date(),
        });
      } catch (insertErr: unknown) {
        // E11000 duplicate key error means a concurrent request already registered this outbox entry!
        if (
          insertErr &&
          typeof insertErr === "object" &&
          "code" in insertErr &&
          (insertErr as { code?: number }).code === 11000
        ) {
          console.log(
            `ℹ️ [EMAIL_CONCURRENCY_LOCKED] Concurrent dispatch intercepted by unique idempotency key for ${recipient} (${idempotencyKey}).`
          );
          const concurrentDoc = await EmailDelivery.findOne({ idempotencyKey });
          return {
            success: true,
            delivered: true,
            alreadyDelivered: true,
            provider: concurrentDoc?.provider || "simulated",
            recipient,
            subject: params.subject,
            timestamp,
          };
        }
        throw insertErr;
      }

      // 3. Dispatch via email client (Resend, simulation, or mock)
      const sendResult = await sendEmail({
        to: recipient,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      // 4. Update audit record with outcome
      if (sendResult.success) {
        // Provider accepted the message (or simulated in local dev/test)
        const finalStatus: EmailDeliveryStatus =
          sendResult.provider === "resend" ? "accepted" : "simulated";

        deliveryRecord.status = finalStatus;
        deliveryRecord.provider = sendResult.provider;
        deliveryRecord.providerMessageId = sendResult.id;
        // In local simulation/mock, delivery is immediate.
        // For production Resend, deliveredAt is set when confirmed by webhook!
        if (sendResult.provider !== "resend") {
          deliveryRecord.deliveredAt = new Date();
        }
        deliveryRecord.error = undefined;
        deliveryRecord.nextRetryAt = undefined;
        await deliveryRecord.save();

        return {
          success: true,
          delivered: true,
          provider: sendResult.provider,
          recipient,
          subject: params.subject,
          timestamp,
        };
      } else {
        const isNonRetryable = isNonRetryableError(sendResult.error);
        deliveryRecord.retryCount += 1;
        deliveryRecord.provider = sendResult.provider;
        deliveryRecord.error = sendResult.error || "Unknown delivery failure";
        deliveryRecord.isNonRetryable = isNonRetryable;

        if (isNonRetryable || deliveryRecord.retryCount >= 5) {
          deliveryRecord.status = "failed";
          deliveryRecord.nextRetryAt = undefined;
        } else {
          deliveryRecord.status = "retry_scheduled";
          const backoffMinutes = Math.min(240, Math.pow(2, deliveryRecord.retryCount));
          deliveryRecord.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        }

        await deliveryRecord.save();

        console.warn(
          `⚠️ [EMAIL_DELIVERY_FAILURE] Failed to deliver ${params.template} to ${recipient} (retryable: ${!isNonRetryable}): ${sendResult.error}`
        );

        return {
          success: false,
          delivered: false,
          provider: sendResult.provider,
          recipient,
          subject: params.subject,
          timestamp,
          error: sendResult.error,
        };
      }
    } catch (auditErr: unknown) {
      const errorMsg = auditErr instanceof Error ? auditErr.message : String(auditErr);
      console.error(`❌ [EMAIL_DISPATCH_EXCEPTION] Failed during email outbox handling:`, errorMsg);
      // Fail safely: never throw out to caller
      return {
        success: false,
        delivered: false,
        provider: "simulated",
        recipient,
        subject: params.subject,
        timestamp,
        error: errorMsg,
      };
    }
  }

  // =========================================================================
  // 1. STUDENT TICKET NOTIFICATIONS
  // =========================================================================

  /**
   * Dispatches Free Ticket Confirmation email and in-app notification
   */
  async notifyFreeTicketIssued(params: {
    userId: string | mongoose.Types.ObjectId;
    studentName: string;
    studentEmail: string;
    eventTitle: string;
    eventVenue: string;
    eventDate: string | Date;
    bookingReference: string;
    tierName: string;
    quantity: number;
    ticketCodes: string[];
    tickets?: TicketSummaryInfo[];
  }): Promise<NotificationResult> {
    // 1. Create In-App Notification
    try {
      await createInAppNotification({
        userId: params.userId,
        title: "Free Ticket Confirmed",
        message: `Your ticket for "${params.eventTitle}" is ready. Code: ${params.ticketCodes.join(", ")}`,
        type: "ticket",
        linkUrl: "/student/tickets",
      });
    } catch (inAppErr) {
      console.error("⚠️ Failed to create in-app notification for free ticket:", inAppErr);
    }

    // 2. Generate and dispatch email
    const { subject, html, text } = renderFreeTicketEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.studentEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "free_ticket_confirmation",
      relatedType: "booking",
      relatedId: params.bookingReference,
      metadata: {
        eventTitle: params.eventTitle,
        tierName: params.tierName,
        quantity: params.quantity,
        ticketCodes: params.ticketCodes,
      },
    });
  }

  /**
   * Dispatches Paid Ticket Receipt email and in-app notification
   */
  async notifyPaidTicketReceipt(params: {
    userId: string | mongoose.Types.ObjectId;
    studentName: string;
    studentEmail: string;
    eventTitle: string;
    eventVenue: string;
    eventDate: string | Date;
    bookingReference: string;
    paymentReference: string;
    tierName: string;
    quantity: number;
    amountInKobo: number;
    paidAt: string | Date;
    ticketCodes: string[];
    tickets?: TicketSummaryInfo[];
  }): Promise<NotificationResult> {
    // 1. Create In-App Notification
    try {
      const nairaStr = Math.floor(params.amountInKobo / 100).toLocaleString("en-NG");
      await createInAppNotification({
        userId: params.userId,
        title: "Payment Confirmed & Tickets Issued",
        message: `Payment of ₦${nairaStr} verified for "${params.eventTitle}". Your digital passes are ready.`,
        type: "payment",
        linkUrl: "/student/tickets",
      });
    } catch (inAppErr) {
      console.error("⚠️ Failed to create in-app notification for paid ticket receipt:", inAppErr);
    }

    // 2. Generate and dispatch email
    const { subject, html, text } = renderPaidTicketReceiptEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.studentEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "paid_ticket_receipt",
      relatedType: "payment",
      relatedId: params.paymentReference,
      metadata: {
        eventTitle: params.eventTitle,
        amountInKobo: params.amountInKobo,
        paymentReference: params.paymentReference,
        bookingReference: params.bookingReference,
        ticketCodes: params.ticketCodes,
      },
    });
  }

  // =========================================================================
  // 2. ORGANIZER ACCREDITATION APPLICATION NOTIFICATIONS
  // =========================================================================

  /**
   * Log, notify, and queue application submission confirmation
   */
  async notifyApplicationSubmitted(params: {
    userId?: string | mongoose.Types.ObjectId;
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    applicantType: "individual" | "organization";
    organizationOrBrandName: string;
  }): Promise<NotificationResult> {
    if (params.userId) {
      try {
        await createInAppNotification({
          userId: params.userId,
          title: "Organizer Application Received",
          message: `Your organizer application for "${params.organizationOrBrandName}" is undergoing superadmin review.`,
          type: "application",
          linkUrl: "/student/organizer-apply",
        });
      } catch (err) {
        console.error("⚠️ In-app notification error:", err);
      }
    }

    const { subject, html, text } = renderOrganizerAppSubmittedEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "organizer_app_submitted",
      relatedType: "application",
      relatedId: params.applicationId,
    });
  }

  /**
   * Log and queue application approval notification
   */
  async notifyApplicationApproved(params: {
    userId?: string | mongoose.Types.ObjectId;
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    brandOrOrgName: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    if (params.userId) {
      try {
        await createInAppNotification({
          userId: params.userId,
          title: "Organizer Accreditation Approved!",
          message: `Congratulations! Your organizer accreditation for "${params.brandOrOrgName}" has been approved.`,
          type: "application",
          linkUrl: "/organizer",
        });
      } catch (err) {
        console.error("⚠️ In-app notification error:", err);
      }
    }

    const { subject, html, text } = renderOrganizerAppApprovedEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "organizer_app_approved",
      relatedType: "application",
      relatedId: params.applicationId,
    });
  }

  /**
   * Log and queue application rejection notification
   */
  async notifyApplicationRejected(params: {
    userId?: string | mongoose.Types.ObjectId;
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    reason: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    if (params.userId) {
      try {
        await createInAppNotification({
          userId: params.userId,
          title: "Organizer Application Update",
          message: `Your organizer application was declined: ${params.reason}`,
          type: "application",
          linkUrl: "/student/organizer-apply",
        });
      } catch (err) {
        console.error("⚠️ In-app notification error:", err);
      }
    }

    const { subject, html, text } = renderOrganizerAppRejectedEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "organizer_app_rejected",
      relatedType: "application",
      relatedId: params.applicationId,
    });
  }

  /**
   * Log and queue changes requested notification
   */
  async notifyChangesRequested(params: {
    userId?: string | mongoose.Types.ObjectId;
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    reason: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    if (params.userId) {
      try {
        await createInAppNotification({
          userId: params.userId,
          title: "Revisions Requested on Application",
          message: `Please update your organizer application: ${params.reason}`,
          type: "application",
          linkUrl: "/student/organizer-apply",
        });
      } catch (err) {
        console.error("⚠️ In-app notification error:", err);
      }
    }

    const { subject, html, text } = renderOrganizerChangesRequestedEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "organizer_changes_requested",
      relatedType: "application",
      relatedId: params.applicationId,
    });
  }

  // =========================================================================
  // 3. EVENT MODERATION NOTIFICATIONS
  // =========================================================================

  /**
   * Notify organizer when event is submitted for review
   */
  async notifyEventSubmitted(params: {
    organizerId: string | mongoose.Types.ObjectId;
    organizerEmail: string;
    organizerName: string;
    eventTitle: string;
    eventId: string;
  }): Promise<NotificationResult> {
    try {
      await createInAppNotification({
        userId: params.organizerId,
        title: "Event Submitted for Review",
        message: `Your event "${params.eventTitle}" has been submitted for moderation.`,
        type: "event",
        linkUrl: `/organizer/events/${params.eventId}`,
      });
    } catch (err) {
      console.error("⚠️ In-app notification error:", err);
    }

    const { subject, html, text } = renderEventSubmittedEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.organizerEmail,
      userId: params.organizerId,
      subject,
      html,
      text,
      template: "event_submitted",
      relatedType: "event",
      relatedId: params.eventId,
    });
  }

  /**
   * Notify organizer when event is approved & published
   */
  async notifyEventApproved(params: {
    organizerId: string | mongoose.Types.ObjectId;
    organizerEmail: string;
    organizerName: string;
    eventTitle: string;
    eventId: string;
    eventSlug?: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    try {
      await createInAppNotification({
        userId: params.organizerId,
        title: "Event Approved & Published! 🎉",
        message: `Your event "${params.eventTitle}" is now live on the OAU event feed.`,
        type: "event",
        linkUrl: params.eventSlug ? `/events/${params.eventSlug}` : `/organizer/events/${params.eventId}`,
      });
    } catch (err) {
      console.error("⚠️ In-app notification error:", err);
    }

    const { subject, html, text } = renderEventApprovedEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.organizerEmail,
      userId: params.organizerId,
      subject,
      html,
      text,
      template: "event_approved",
      relatedType: "event",
      relatedId: params.eventId,
    });
  }

  /**
   * Notify organizer when event review requires revisions
   */
  async notifyEventRejected(params: {
    organizerId: string | mongoose.Types.ObjectId;
    organizerEmail: string;
    organizerName: string;
    eventTitle: string;
    eventId: string;
    reason: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    try {
      await createInAppNotification({
        userId: params.organizerId,
        title: "Event Revision Required",
        message: `Revisions requested for "${params.eventTitle}": ${params.reason}`,
        type: "event",
        linkUrl: `/organizer/events/${params.eventId}`,
      });
    } catch (err) {
      console.error("⚠️ In-app notification error:", err);
    }

    const { subject, html, text } = renderEventRejectedEmail(params);

    return this.dispatchEmailWithAudit({
      recipient: params.organizerEmail,
      userId: params.organizerId,
      subject,
      html,
      text,
      template: "event_rejected",
      relatedType: "event",
      relatedId: params.eventId,
    });
  }

  // =========================================================================
  // 4. FINANCIAL PAYOUT & REFUND NOTIFICATIONS
  // =========================================================================

  /**
   * Notify organizer of payout account status update
   */
  async notifyPayoutAccountStatus(params: {
    organizerId?: string | mongoose.Types.ObjectId;
    recipientEmail: string;
    organizerName: string;
    bankName: string;
    accountNumberMasked: string;
    status: "verified" | "rejected" | "disabled";
    reason?: string;
  }): Promise<NotificationResult> {
    if (params.organizerId) {
      try {
        await createInAppNotification({
          userId: params.organizerId,
          title: `Payout Account ${params.status.toUpperCase()}`,
          message: `Your settlement account ${params.bankName} (${params.accountNumberMasked}) status: ${params.status}.`,
          type: "payout",
          linkUrl: "/organizer/payouts",
        });
      } catch (err) {
        console.error("⚠️ In-app notification error:", err);
      }
    }

    const subject = `NOTARI 2.0: Payout Account ${params.status.toUpperCase()}`;
    const text = `Hello ${params.organizerName}, your settlement account ${params.bankName} (${params.accountNumberMasked}) is now ${params.status}.`;

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.organizerId,
      subject,
      html: `<p>${text}</p>`,
      text,
      template: "payout_account_status",
      relatedType: "payout",
      relatedId: params.accountNumberMasked,
    });
  }

  /**
   * Notify organizer of payout request status update
   */
  async notifyPayoutStatus(params: {
    organizerId?: string | mongoose.Types.ObjectId;
    recipientEmail: string;
    organizerName: string;
    reference: string;
    amountInNaira: number;
    status: string;
    reason?: string;
    bankName?: string;
    accountMasked?: string;
  }): Promise<NotificationResult> {
    if (params.organizerId) {
      try {
        await createInAppNotification({
          userId: params.organizerId,
          title: `Payout ${params.status.toUpperCase()}`,
          message: `Payout request ${params.reference} of ₦${params.amountInNaira.toLocaleString()} is ${params.status}.`,
          type: "payout",
          linkUrl: "/organizer/payouts",
        });
      } catch (err) {
        console.error("⚠️ In-app notification error:", err);
      }
    }

    const { subject, html, text } = renderPayoutStatusEmail({
      organizerEmail: params.recipientEmail,
      organizerName: params.organizerName,
      reference: params.reference,
      amountInNaira: params.amountInNaira,
      status: params.status,
      reason: params.reason,
      bankName: params.bankName,
      accountMasked: params.accountMasked,
    });

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.organizerId,
      subject,
      html,
      text,
      template: "payout_status",
      relatedType: "payout",
      relatedId: params.reference,
    });
  }

  /**
   * Notify student of refund request status update
   */
  async notifyRefundStatus(params: {
    studentId?: string | mongoose.Types.ObjectId;
    recipientEmail: string;
    studentName: string;
    reference: string;
    bookingReference?: string;
    eventTitle?: string;
    amountInNaira: number;
    status: "pending" | "approved" | "processing" | "successful" | "rejected";
    reason?: string;
  }): Promise<NotificationResult> {
    if (params.studentId) {
      try {
        await createInAppNotification({
          userId: params.studentId,
          title: `Refund Request ${params.status.toUpperCase()}`,
          message: `Ticket refund ${params.reference} of ₦${params.amountInNaira.toLocaleString()} is ${params.status}.`,
          type: "refund",
          linkUrl: "/student/history",
        });
      } catch (err) {
        console.error("⚠️ In-app notification error:", err);
      }
    }

    const { subject, html, text } = renderRefundStatusEmail({
      studentEmail: params.recipientEmail,
      studentName: params.studentName,
      reference: params.reference,
      bookingReference: params.bookingReference,
      eventTitle: params.eventTitle,
      amountInNaira: params.amountInNaira,
      status: params.status,
      reason: params.reason,
    });

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.studentId,
      subject,
      html,
      text,
      template: "refund_status",
      relatedType: "refund",
      relatedId: params.reference,
    });
  }

  /**
   * Admin-initiated retry for a failed or pending email delivery.
   * Enforces exponential backoff / retry bounding (max 5 attempts).
   */
  public async retryFailedDelivery(deliveryId: string): Promise<{
    success: boolean;
    status: number;
    message: string;
    delivery?: IEmailDeliveryDocument | null;
  }> {
    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      return { success: false, status: 400, message: "Invalid delivery identifier" };
    }

    await connectToDatabase();

    const delivery = await EmailDelivery.findById(deliveryId);
    if (!delivery) {
      return { success: false, status: 404, message: "Email delivery record not found" };
    }

    if (
      delivery.status === "sent" ||
      delivery.status === "accepted" ||
      delivery.status === "delivered" ||
      delivery.status === "simulated"
    ) {
      return {
        success: false,
        status: 400,
        message: "Email delivery has already been successfully dispatched.",
        delivery,
      };
    }

    if (delivery.isNonRetryable) {
      return {
        success: false,
        status: 422,
        message:
          "This delivery failure is non-retryable (e.g. permanent bounce or invalid recipient address).",
        delivery,
      };
    }

    if (delivery.retryCount >= 5) {
      return {
        success: false,
        status: 422,
        message: "Maximum delivery retry attempts (5) exceeded for this message.",
        delivery,
      };
    }

    const html = (delivery.metadata?.html as string) || `<p>${delivery.subject}</p>`;
    const text = (delivery.metadata?.text as string) || delivery.subject;

    delivery.lastAttemptAt = new Date();

    try {
      const sendResult = await sendEmail({
        to: delivery.recipient,
        subject: delivery.subject,
        html,
        text,
      });

      if (sendResult.success) {
        delivery.status = sendResult.provider === "resend" ? "accepted" : "simulated";
        delivery.provider = sendResult.provider;
        delivery.providerMessageId = sendResult.id;
        if (sendResult.provider !== "resend") {
          delivery.deliveredAt = new Date();
        }
        delivery.error = undefined;
        delivery.nextRetryAt = undefined;
        await delivery.save();

        return {
          success: true,
          status: 200,
          message: "Email delivery re-dispatched successfully.",
          delivery,
        };
      } else {
        const isNonRetryable = isNonRetryableError(sendResult.error);
        delivery.retryCount += 1;
        delivery.isNonRetryable = isNonRetryable;
        delivery.error = sendResult.error || "Retry dispatch failed";

        if (isNonRetryable || delivery.retryCount >= 5) {
          delivery.status = "failed";
          delivery.nextRetryAt = undefined;
        } else {
          delivery.status = "retry_scheduled";
          const backoffMinutes = Math.min(240, Math.pow(2, delivery.retryCount));
          delivery.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        }

        await delivery.save();

        return {
          success: false,
          status: 502,
          message: `Retry dispatch failed: ${sendResult.error}`,
          delivery,
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isNonRetryable = isNonRetryableError(errorMsg);
      delivery.retryCount += 1;
      delivery.isNonRetryable = isNonRetryable;
      delivery.error = errorMsg;

      if (isNonRetryable || delivery.retryCount >= 5) {
        delivery.status = "failed";
        delivery.nextRetryAt = undefined;
      } else {
        delivery.status = "retry_scheduled";
        const backoffMinutes = Math.min(240, Math.pow(2, delivery.retryCount));
        delivery.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
      }

      await delivery.save();

      return {
        success: false,
        status: 500,
        message: `Retry dispatch exception: ${errorMsg}`,
        delivery,
      };
    }
  }

  /**
   * Dispatches automated event reminder (24h or 1h) to a student via in-app & email.
   * Respects student emailPreferences.eventReminders.
   */
  async notifyEventReminder(params: {
    userId: string | mongoose.Types.ObjectId;
    studentName: string;
    studentEmail: string;
    eventId: string | mongoose.Types.ObjectId;
    eventTitle: string;
    eventVenue: string;
    eventDate: Date | string;
    stage: "24h" | "1h" | "custom";
    scheduleVersion?: number;
    scheduleKey?: string;
    bookingReference?: string;
    ticketCodes?: string[];
    onlineLink?: string;
    customMessage?: string;
  }): Promise<NotificationResult> {
    const timestamp = new Date().toISOString();
    const eventIdStr = params.eventId.toString();
    const stageCallout = params.stage === "24h" ? "Tomorrow" : "In 1 Hour";
    const scheduleIdentifier =
      params.scheduleKey ||
      `v${params.scheduleVersion || 1}_${new Date(params.eventDate).getTime()}`;

    // 1. Always deliver in-app notification
    await createInAppNotification({
      userId: params.userId,
      title: `Event Reminder (${stageCallout}): ${params.eventTitle}`,
      message: `Your event "${params.eventTitle}" begins ${stageCallout.toLowerCase()} at ${params.eventVenue}. Have your digital QR ticket ready for fast admission.`,
      type: "event",
      linkUrl: `/student/tickets`,
    });

    // 2. Check student email preference
    let emailAllowed = true;
    try {
      const userDoc = await User.findById(params.userId).select("emailPreferences");
      if (userDoc?.emailPreferences?.eventReminders === false) {
        emailAllowed = false;
      }
    } catch (err) {
      console.warn("⚠️ [PREF_CHECK_WARN]: Could not check emailPreferences, defaulting to allowed:", err);
    }

    if (!emailAllowed) {
      return {
        success: true,
        delivered: false,
        provider: "simulated",
        recipient: params.studentEmail,
        subject: `Reminder: ${params.eventTitle}`,
        timestamp,
        alreadyDelivered: true,
      };
    }

    // 3. Render and dispatch email with outbox audit
    const { html, text, subject } = renderEventReminderEmail({
      studentName: params.studentName,
      eventTitle: params.eventTitle,
      eventVenue: params.eventVenue,
      eventDate: params.eventDate,
      stage: params.stage,
      bookingReference: params.bookingReference,
      ticketCodes: params.ticketCodes,
      onlineLink: params.onlineLink,
      customMessage: params.customMessage,
    });

    return this.dispatchEmailWithAudit({
      recipient: params.studentEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "event_reminder",
      relatedType: "reminder",
      relatedId: `${eventIdStr}:${params.stage}:${scheduleIdentifier}`,
      metadata: {
        eventId: eventIdStr,
        stage: params.stage,
        eventTitle: params.eventTitle,
        bookingReference: params.bookingReference,
      },
    });
  }

  /**
   * Dispatches campus announcement to an eligible student.
   * Respects student emailPreferences.campusAnnouncements unless priority is "urgent".
   */
  async notifyCampusAnnouncement(params: {
    userId: string | mongoose.Types.ObjectId;
    recipientName: string;
    recipientEmail: string;
    announcementId: string | mongoose.Types.ObjectId;
    title: string;
    summary: string;
    content: string;
    category: string;
    priority: "low" | "normal" | "high" | "urgent";
    authorName?: string;
    eventTitle?: string;
  }): Promise<NotificationResult> {
    const timestamp = new Date().toISOString();
    const announcementIdStr = params.announcementId.toString();

    // 1. Always deliver in-app notification
    await createInAppNotification({
      userId: params.userId,
      title: `${params.priority === "urgent" ? "🚨 " : ""}${params.title}`,
      message: params.summary,
      type: "announcement",
      linkUrl: `/student/announcements`,
    });

    // 2. Check student email preference (urgent campus safety notices bypass preference)
    let emailAllowed = true;
    if (params.priority !== "urgent") {
      try {
        const userDoc = await User.findById(params.userId).select("emailPreferences");
        if (userDoc?.emailPreferences?.campusAnnouncements === false) {
          emailAllowed = false;
        }
      } catch (err) {
        console.warn("⚠️ [PREF_CHECK_WARN]: Could not check emailPreferences, defaulting to allowed:", err);
      }
    }

    if (!emailAllowed) {
      return {
        success: true,
        delivered: false,
        provider: "simulated",
        recipient: params.recipientEmail,
        subject: params.title,
        timestamp,
        alreadyDelivered: true,
      };
    }

    // 3. Render and dispatch email with outbox audit
    const { html, text, subject } = renderCampusAnnouncementEmail({
      recipientName: params.recipientName,
      title: params.title,
      summary: params.summary,
      content: params.content,
      category: params.category,
      priority: params.priority,
      authorName: params.authorName,
      eventTitle: params.eventTitle,
    });

    return this.dispatchEmailWithAudit({
      recipient: params.recipientEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "campus_announcement",
      relatedType: "announcement",
      relatedId: announcementIdStr,
      metadata: {
        announcementId: announcementIdStr,
        category: params.category,
        priority: params.priority,
      },
    });
  }

  /**
   * Dispatches organizer event update broadcast to registered attendee.
   */
  async notifyOrganizerEventBroadcast(params: {
    userId: string | mongoose.Types.ObjectId;
    attendeeName: string;
    attendeeEmail: string;
    eventId: string | mongoose.Types.ObjectId;
    eventTitle: string;
    broadcastId: string;
    updateType: "general" | "venue_change" | "time_change" | "cancellation" | "instructions";
    subjectLine: string;
    message: string;
    organizerName: string;
    newVenue?: string;
    newTime?: string;
  }): Promise<NotificationResult> {
    const timestamp = new Date().toISOString();
    const eventIdStr = params.eventId.toString();

    // 1. Deliver in-app notification
    await createInAppNotification({
      userId: params.userId,
      title: `Event Notice: ${params.eventTitle}`,
      message: `${params.subjectLine} — ${params.message.slice(0, 120)}`,
      type: "event",
      linkUrl: `/student/tickets`,
    });

    // 2. Check student email preference (cancellations and critical time/venue changes bypass opt-out)
    let emailAllowed = true;
    if (params.updateType === "general") {
      try {
        const userDoc = await User.findById(params.userId).select("emailPreferences");
        if (userDoc?.emailPreferences?.campusAnnouncements === false) {
          emailAllowed = false;
        }
      } catch (err) {
        console.warn("⚠️ [PREF_CHECK_WARN]: Could not check emailPreferences, defaulting to allowed:", err);
      }
    }

    if (!emailAllowed) {
      return {
        success: true,
        delivered: false,
        provider: "simulated",
        recipient: params.attendeeEmail,
        subject: params.subjectLine,
        timestamp,
        alreadyDelivered: true,
      };
    }

    // 3. Render and dispatch email
    const { html, text, subject } = renderOrganizerEventBroadcastEmail({
      attendeeName: params.attendeeName,
      eventTitle: params.eventTitle,
      updateType: params.updateType,
      subjectLine: params.subjectLine,
      message: params.message,
      organizerName: params.organizerName,
      newVenue: params.newVenue,
      newTime: params.newTime,
    });

    return this.dispatchEmailWithAudit({
      recipient: params.attendeeEmail,
      userId: params.userId,
      subject,
      html,
      text,
      template: "organizer_event_broadcast",
      relatedType: "announcement",
      relatedId: `${eventIdStr}:${params.broadcastId}`,
      metadata: {
        eventId: eventIdStr,
        broadcastId: params.broadcastId,
        updateType: params.updateType,
      },
    });
  }

  /**
   * Automated batch processor for scheduled email retries.
   * Atomically acquires pending or retry-scheduled records due for re-dispatch,
   * prevents concurrent retry execution via atomic conditional locking,
   * enforces bounded exponential backoff, and skips non-retryable errors.
   */
  public async processPendingRetries(options?: {
    batchSize?: number;
  }): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    details: Array<{ id: string; recipient: string; status: string; error?: string }>;
  }> {
    const batchSize = Math.min(100, Math.max(1, options?.batchSize || 20));
    await connectToDatabase();

    const now = new Date();

    // 1. Query candidate records due for retry
    const candidates = await EmailDelivery.find({
      status: { $in: ["failed", "retry_scheduled"] },
      retryCount: { $lt: 5 },
      isNonRetryable: { $ne: true },
      $or: [{ nextRetryAt: { $exists: false } }, { nextRetryAt: { $lte: now } }],
    })
      .sort({ nextRetryAt: 1, lastAttemptAt: 1 })
      .limit(batchSize)
      .lean();

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const details: Array<{ id: string; recipient: string; status: string; error?: string }> = [];

    for (const candidate of candidates) {
      // 2. Atomic lock: claim record to prevent parallel cron/admin workers from double-sending
      const claimed = await EmailDelivery.findOneAndUpdate(
        {
          _id: candidate._id,
          status: { $in: ["failed", "retry_scheduled"] },
          retryCount: candidate.retryCount,
        },
        {
          $set: {
            status: "pending",
            lastAttemptAt: new Date(),
          },
        },
        { new: true }
      );

      if (!claimed) {
        skipped++;
        continue;
      }

      processed++;

      const html = (claimed.metadata?.html as string) || `<p>${claimed.subject}</p>`;
      const text = (claimed.metadata?.text as string) || claimed.subject;

      try {
        const sendResult = await sendEmail({
          to: claimed.recipient,
          subject: claimed.subject,
          html,
          text,
        });

        if (sendResult.success) {
          claimed.status = sendResult.provider === "resend" ? "accepted" : "simulated";
          claimed.provider = sendResult.provider;
          claimed.providerMessageId = sendResult.id;
          if (sendResult.provider !== "resend") {
            claimed.deliveredAt = new Date();
          }
          claimed.error = undefined;
          claimed.nextRetryAt = undefined;
          await claimed.save();

          succeeded++;
          details.push({
            id: claimed._id.toString(),
            recipient: claimed.recipient,
            status: claimed.status,
          });
        } else {
          const isNonRetryable = isNonRetryableError(sendResult.error);
          claimed.retryCount += 1;
          claimed.isNonRetryable = isNonRetryable;
          claimed.error = sendResult.error || "Automated retry failed";

          if (isNonRetryable || claimed.retryCount >= 5) {
            claimed.status = "failed";
            claimed.nextRetryAt = undefined;
          } else {
            claimed.status = "retry_scheduled";
            const backoffMinutes = Math.min(240, Math.pow(2, claimed.retryCount));
            claimed.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
          }

          await claimed.save();

          failed++;
          details.push({
            id: claimed._id.toString(),
            recipient: claimed.recipient,
            status: claimed.status,
            error: sendResult.error,
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isNonRetryable = isNonRetryableError(errorMsg);
        claimed.retryCount += 1;
        claimed.isNonRetryable = isNonRetryable;
        claimed.error = errorMsg;

        if (isNonRetryable || claimed.retryCount >= 5) {
          claimed.status = "failed";
          claimed.nextRetryAt = undefined;
        } else {
          claimed.status = "retry_scheduled";
          const backoffMinutes = Math.min(240, Math.pow(2, claimed.retryCount));
          claimed.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        }

        await claimed.save();

        failed++;
        details.push({
          id: claimed._id.toString(),
          recipient: claimed.recipient,
          status: claimed.status,
          error: errorMsg,
        });
      }
    }

    return {
      processed,
      succeeded,
      failed,
      skipped,
      details,
    };
  }
}

export const notificationService = new NotificationService();
