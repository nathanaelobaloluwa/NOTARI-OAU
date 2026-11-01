/**
 * NOTARI 2.0 Notification Service Boundary
 *
 * Provides a clean architectural boundary for transaction and audit notifications.
 * Currently records structured events in logs. When an external email delivery provider
 * (e.g., Resend, Sendgrid, or SMTP) credentials are provided in production, this service
 * will dispatch the transactional messages.
 */

export interface NotificationResult {
  success: boolean;
  delivered: boolean;
  provider: "simulated_logger" | "smtp" | "resend";
  recipient: string;
  subject: string;
  timestamp: string;
}

class NotificationService {
  /**
   * Log and queue application submission confirmation
   */
  async notifyApplicationSubmitted(params: {
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    applicantType: "individual" | "organization";
    organizationOrBrandName: string;
  }): Promise<NotificationResult> {
    const subject = "NOTARI 2.0: Organizer Application Received";
    console.log(
      `📧 [NOTIFICATION DISPATCH] ${subject} -> To: ${params.recipientEmail} | App ID: ${params.applicationId} | Type: ${params.applicantType}`
    );

    return {
      success: true,
      delivered: false, // Explicitly false since external email transport is not yet configured
      provider: "simulated_logger",
      recipient: params.recipientEmail,
      subject,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log and queue application approval notification
   */
  async notifyApplicationApproved(params: {
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    brandOrOrgName: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    const subject = "🎉 NOTARI 2.0: Your Organizer Accreditation Has Been Approved!";
    console.log(
      `📧 [NOTIFICATION DISPATCH] ${subject} -> To: ${params.recipientEmail} | Org: ${params.brandOrOrgName} | Reviewed By: ${params.reviewerName || "Admin"}`
    );

    return {
      success: true,
      delivered: false,
      provider: "simulated_logger",
      recipient: params.recipientEmail,
      subject,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log and queue application rejection notification
   */
  async notifyApplicationRejected(params: {
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    reason: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    const subject = "NOTARI 2.0: Organizer Application Status Update";
    console.log(
      `📧 [NOTIFICATION DISPATCH] ${subject} -> To: ${params.recipientEmail} | Rejection Reason: "${params.reason}"`
    );

    return {
      success: true,
      delivered: false,
      provider: "simulated_logger",
      recipient: params.recipientEmail,
      subject,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log and queue changes requested notification
   */
  async notifyChangesRequested(params: {
    applicationId: string;
    recipientEmail: string;
    applicantName: string;
    reason: string;
    reviewerName?: string;
  }): Promise<NotificationResult> {
    const subject = "Action Required: Revisions Requested for Your NOTARI Organizer Application";
    console.log(
      `📧 [NOTIFICATION DISPATCH] ${subject} -> To: ${params.recipientEmail} | Requested Changes: "${params.reason}"`
    );

    return {
      success: true,
      delivered: false,
      provider: "simulated_logger",
      recipient: params.recipientEmail,
      subject,
      timestamp: new Date().toISOString(),
    };
  }
}

export const notificationService = new NotificationService();

