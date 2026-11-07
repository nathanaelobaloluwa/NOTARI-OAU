import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { EmailDelivery, EmailRelatedType, EmailDeliveryStatus } from "@/models/EmailDelivery";
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

      // 1. Idempotency Check: prevent duplicate emails from webhook retries
      if (params.relatedId && params.relatedType) {
        const existing = await EmailDelivery.findOne({
          recipient,
          relatedType: params.relatedType,
          relatedId: params.relatedId,
          template: params.template,
          status: { $in: ["sent", "simulated"] },
        });

        if (existing) {
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

      // 2. Create pending outbox audit record
      const deliveryRecord = await EmailDelivery.create({
        recipient,
        userId: userObjectId,
        subject: params.subject,
        template: params.template,
        status: "pending",
        provider: "simulated",
        relatedType: params.relatedType || "system",
        relatedId: params.relatedId,
        metadata: params.metadata,
        lastAttemptAt: new Date(),
      });

      // 3. Dispatch via email client (Resend, simulation, or mock)
      const sendResult = await sendEmail({
        to: recipient,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      // 4. Update audit record with outcome
      if (sendResult.success) {
        const finalStatus: EmailDeliveryStatus =
          sendResult.provider === "resend" ? "sent" : "simulated";

        deliveryRecord.status = finalStatus;
        deliveryRecord.provider = sendResult.provider;
        deliveryRecord.providerMessageId = sendResult.id;
        deliveryRecord.error = undefined;
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
        deliveryRecord.status = "failed";
        deliveryRecord.provider = sendResult.provider;
        deliveryRecord.error = sendResult.error || "Unknown delivery failure";
        deliveryRecord.retryCount += 1;
        await deliveryRecord.save();

        console.warn(`⚠️ [EMAIL_DELIVERY_FAILURE] Failed to deliver ${params.template} to ${recipient}: ${sendResult.error}`);

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
}

export const notificationService = new NotificationService();
