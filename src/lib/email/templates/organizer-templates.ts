import { env } from "@/config/env";
import {
  renderEmailLayout,
  renderPlainText,
  EmailKeyValuePair,
} from "./base-layout";

function getBaseUrl(customUrl?: string): string {
  return customUrl || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// 1. ORGANIZER ACCREDITATION APPLICATION TEMPLATES
// ---------------------------------------------------------------------------

export interface OrganizerAppSubmittedParams {
  recipientEmail: string;
  applicantName: string;
  applicantType: "individual" | "organization";
  organizationOrBrandName: string;
  applicationId: string;
  appUrl?: string;
}

export function renderOrganizerAppSubmittedEmail(params: OrganizerAppSubmittedParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const subject = "NOTARI 2.0: Organizer Accreditation Application Received";

  const keyValues: EmailKeyValuePair[] = [
    { label: "Applicant Name", value: params.applicantName },
    { label: "Organization / Brand", value: params.organizationOrBrandName },
    { label: "Application Type", value: params.applicantType === "organization" ? "Campus Organization" : "Student Host" },
    { label: "Application ID", value: params.applicationId },
    { label: "Current Status", value: "Pending Superadmin Review" },
  ];

  const html = renderEmailLayout({
    title: "Application Received",
    previewText: `Your organizer accreditation application for ${params.organizationOrBrandName} has been received.`,
    badge: { text: "Accreditation", variant: "primary" },
    leadText: `Hello ${params.applicantName}, we have received your organizer accreditation application on NOTARI 2.0.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Our Superadmin team reviews all event host applications in accordance with Obafemi Awolowo University campus event security and safety standards.
      </p>
      <p style="margin: 0 0 12px 0;">
        You will receive an automated email decision once your credentials, matriculation details, and organization affiliation have been verified.
      </p>
    `,
    keyValues,
    cta: {
      label: "View Application Status",
      url: `${baseUrl}/student/organizer-apply`,
      variant: "primary",
    },
  });

  const text = renderPlainText({
    title: "Organizer Accreditation Application Received",
    leadText: `Hello ${params.applicantName}, your application for ${params.organizationOrBrandName} has been received.`,
    details: {
      "Applicant Name": params.applicantName,
      "Organization / Brand": params.organizationOrBrandName,
      Type: params.applicantType,
      "Application ID": params.applicationId,
      Status: "Pending Superadmin Review",
    },
    ctaLabel: "Check Status",
    ctaUrl: `${baseUrl}/student/organizer-apply`,
    extraText: "Superadmins typically review applications within 24 to 48 hours.",
  });

  return { subject, html, text };
}

export interface OrganizerAppApprovedParams {
  recipientEmail: string;
  applicantName: string;
  brandOrOrgName: string;
  reviewerName?: string;
  appUrl?: string;
}

export function renderOrganizerAppApprovedEmail(params: OrganizerAppApprovedParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const subject = "🎉 Congratulations: Your NOTARI Organizer Accreditation is Approved!";

  const keyValues: EmailKeyValuePair[] = [
    { label: "Accredited Host", value: params.brandOrOrgName },
    { label: "Accreditation Status", value: "Verified Campus Organizer" },
    { label: "Approved By", value: params.reviewerName || "Super Administrator" },
    { label: "Event Creation", value: "Unlocked & Active" },
  ];

  const html = renderEmailLayout({
    title: "You Are Now a Verified Organizer!",
    previewText: `Congratulations! ${params.brandOrOrgName} is now accredited to host events on NOTARI 2.0.`,
    badge: { text: "Approved", variant: "success" },
    leadText: `Congratulations ${params.applicantName}! Your application for <strong>${params.brandOrOrgName}</strong> has been officially approved.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        You now have full access to the NOTARI 2.0 Organizer Hub. You can now:
      </p>
      <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #334155;">
        <li style="margin-bottom: 6px;">Create and publish free and paid university events.</li>
        <li style="margin-bottom: 6px;">Issue authentic HMAC-secured digital QR tickets.</li>
        <li style="margin-bottom: 6px;">Scan attendee passes at the door with camera check-in.</li>
        <li style="margin-bottom: 6px;">Receive automated direct bank settlements and payouts.</li>
      </ul>
    `,
    keyValues,
    alert: {
      type: "success",
      message: "🌟 <strong>Next Step:</strong> Navigate to your Organizer Dashboard to set up your profile and create your first event.",
    },
    cta: {
      label: "Go to Organizer Hub",
      url: `${baseUrl}/organizer`,
      variant: "primary",
    },
    secondaryCta: {
      label: "Create First Event",
      url: `${baseUrl}/organizer/events/create`,
      variant: "secondary",
    },
  });

  const text = renderPlainText({
    title: "Organizer Accreditation Approved",
    leadText: `Congratulations ${params.applicantName}! Your organizer accreditation for ${params.brandOrOrgName} has been approved.`,
    details: {
      "Accredited Host": params.brandOrOrgName,
      Status: "Verified Campus Organizer",
      "Approved By": params.reviewerName || "Superadmin",
    },
    ctaLabel: "Open Organizer Dashboard",
    ctaUrl: `${baseUrl}/organizer`,
    extraText: "You can now create events, configure ticket tiers, and scan tickets at event doors.",
  });

  return { subject, html, text };
}

export interface OrganizerAppRejectedParams {
  recipientEmail: string;
  applicantName: string;
  brandOrOrgName?: string;
  reason: string;
  reviewerName?: string;
  appUrl?: string;
}

export function renderOrganizerAppRejectedEmail(params: OrganizerAppRejectedParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const subject = "NOTARI 2.0: Organizer Application Status Update";

  const keyValues: EmailKeyValuePair[] = [
    { label: "Applicant Name", value: params.applicantName },
    { label: "Status", value: "Declined" },
    { label: "Reviewed By", value: params.reviewerName || "Superadmin" },
  ];

  const html = renderEmailLayout({
    title: "Application Status Update",
    previewText: "Your NOTARI organizer accreditation application was not approved.",
    badge: { text: "Application Declined", variant: "danger" },
    leadText: `Hello ${params.applicantName}, thank you for your interest in hosting events on NOTARI 2.0.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Following superadmin review, your application could not be accredited at this time.
      </p>
    `,
    keyValues,
    alert: {
      type: "danger",
      message: `<strong>Reviewer Feedback:</strong> ${params.reason || "Does not meet current university event accreditation guidelines."}`,
    },
    cta: {
      label: "Review Application Guidelines",
      url: `${baseUrl}/student/organizer-apply`,
      variant: "primary",
    },
  });

  const text = renderPlainText({
    title: "Organizer Application Update",
    leadText: `Hello ${params.applicantName}, your application could not be approved at this time.`,
    details: {
      Status: "Declined",
      Reason: params.reason || "Does not meet accreditation guidelines.",
    },
    ctaLabel: "View Application Guidelines",
    ctaUrl: `${baseUrl}/student/organizer-apply`,
  });

  return { subject, html, text };
}

export interface OrganizerChangesRequestedParams {
  recipientEmail: string;
  applicantName: string;
  reason: string;
  reviewerName?: string;
  appUrl?: string;
}

export function renderOrganizerChangesRequestedEmail(params: OrganizerChangesRequestedParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const subject = "Action Required: Revisions Requested for Your NOTARI Application";

  const html = renderEmailLayout({
    title: "Revisions Requested",
    previewText: "Additional information is required for your NOTARI organizer accreditation.",
    badge: { text: "Action Required", variant: "warning" },
    leadText: `Hello ${params.applicantName}, the Superadmin reviewing your accreditation application has requested additional information.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Please review the reviewer notes below and update your application details so we can complete your verification.
      </p>
    `,
    alert: {
      type: "warning",
      message: `<strong>Requested Revisions:</strong> ${params.reason}`,
    },
    cta: {
      label: "Update Application",
      url: `${baseUrl}/student/organizer-apply`,
      variant: "primary",
    },
  });

  const text = renderPlainText({
    title: "Revisions Requested for Organizer Application",
    leadText: `Hello ${params.applicantName}, please update your organizer application per reviewer notes.`,
    details: {
      "Requested Revisions": params.reason,
    },
    ctaLabel: "Update Application",
    ctaUrl: `${baseUrl}/student/organizer-apply`,
  });

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 2. EVENT MODERATION NOTIFICATION TEMPLATES
// ---------------------------------------------------------------------------

export interface EventModerationParams {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  eventId: string;
  eventSlug?: string;
  venue?: string;
  reason?: string;
  reviewerName?: string;
  appUrl?: string;
}

export function renderEventSubmittedEmail(params: EventModerationParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const subject = `Event Under Review: ${params.eventTitle} - NOTARI OAU`;

  const keyValues: EmailKeyValuePair[] = [
    { label: "Event Title", value: params.eventTitle },
    { label: "Event ID", value: params.eventId },
    { label: "Status", value: "Pending Superadmin Moderation" },
  ];

  const html = renderEmailLayout({
    title: "Event Submitted for Review",
    previewText: `Your event "${params.eventTitle}" has been submitted for moderation.`,
    badge: { text: "Under Review", variant: "primary" },
    leadText: `Hello ${params.organizerName}, your event submission <strong>${params.eventTitle}</strong> is now under moderation.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Superadmins moderate events to ensure compliance with university guidelines, venue availability, and student safety.
        You will receive an automated notification as soon as the review is complete.
      </p>
    `,
    keyValues,
    cta: {
      label: "View Event Dashboard",
      url: `${baseUrl}/organizer/events/${params.eventId}`,
      variant: "primary",
    },
  });

  const text = renderPlainText({
    title: `Event Submitted: ${params.eventTitle}`,
    leadText: `Hello ${params.organizerName}, your event "${params.eventTitle}" has been submitted for Superadmin review.`,
    details: {
      Event: params.eventTitle,
      Status: "Pending Moderation",
    },
    ctaLabel: "View Event",
    ctaUrl: `${baseUrl}/organizer/events/${params.eventId}`,
  });

  return { subject, html, text };
}

export function renderEventApprovedEmail(params: EventModerationParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const eventLink = params.eventSlug ? `${baseUrl}/events/${params.eventSlug}` : `${baseUrl}/events`;
  const subject = `🎉 Published: Your Event "${params.eventTitle}" is Live!`;

  const keyValues: EmailKeyValuePair[] = [
    { label: "Event Title", value: params.eventTitle },
    { label: "Status", value: "Published & Active" },
    { label: "Approved By", value: params.reviewerName || "Superadmin" },
  ];

  const html = renderEmailLayout({
    title: "Your Event is Live!",
    previewText: `"${params.eventTitle}" is approved and published on the OAU event feed.`,
    badge: { text: "Published", variant: "success" },
    leadText: `Great news ${params.organizerName}! Your event <strong>${params.eventTitle}</strong> has been approved and published.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Students across Great Ife can now discover your event, book tickets, and receive authentic digital QR passes.
      </p>
    `,
    keyValues,
    alert: {
      type: "success",
      message: "🚀 <strong>Share Your Event:</strong> Share your official event link on WhatsApp groups, departmental boards, and social media.",
    },
    cta: {
      label: "View Live Public Event",
      url: eventLink,
      variant: "primary",
    },
    secondaryCta: {
      label: "Event Management",
      url: `${baseUrl}/organizer/events/${params.eventId}`,
      variant: "secondary",
    },
  });

  const text = renderPlainText({
    title: `Event Published: ${params.eventTitle}`,
    leadText: `Hello ${params.organizerName}, your event "${params.eventTitle}" is approved and live on the OAU feed.`,
    details: {
      Event: params.eventTitle,
      Status: "Published & Active",
    },
    ctaLabel: "View Live Event",
    ctaUrl: eventLink,
  });

  return { subject, html, text };
}

export function renderEventRejectedEmail(params: EventModerationParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const subject = `Revision Needed: ${params.eventTitle} - NOTARI OAU`;

  const html = renderEmailLayout({
    title: "Event Review Feedback",
    previewText: `Revisions requested for your event "${params.eventTitle}".`,
    badge: { text: "Revision Required", variant: "warning" },
    leadText: `Hello ${params.organizerName}, your event submission <strong>${params.eventTitle}</strong> requires revisions before it can be published.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Please review the administrator feedback below, edit your event details in the organizer dashboard, and resubmit for review.
      </p>
    `,
    alert: {
      type: "warning",
      message: `<strong>Administrator Feedback:</strong> ${params.reason || "Please ensure all venue, timing, and ticket information comply with campus event policy."}`,
    },
    cta: {
      label: "Edit Event & Resubmit",
      url: `${baseUrl}/organizer/events/${params.eventId}`,
      variant: "primary",
    },
  });

  const text = renderPlainText({
    title: `Event Feedback: ${params.eventTitle}`,
    leadText: `Hello ${params.organizerName}, your event requires revisions.`,
    details: {
      Event: params.eventTitle,
      Feedback: params.reason || "Please update event details per university guidelines.",
    },
    ctaLabel: "Edit and Resubmit",
    ctaUrl: `${baseUrl}/organizer/events/${params.eventId}`,
  });

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// 3. ORGANIZER PAYOUT SETTLEMENT NOTIFICATION TEMPLATES
// ---------------------------------------------------------------------------

export interface PayoutNotificationParams {
  organizerEmail: string;
  organizerName: string;
  reference: string;
  amountInNaira: number;
  status: string;
  reason?: string;
  bankName?: string;
  accountMasked?: string;
  appUrl?: string;
}

export function renderPayoutStatusEmail(params: PayoutNotificationParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const statusUpper = params.status.toUpperCase();
  const formattedAmount = `₦${params.amountInNaira.toLocaleString("en-NG")}`;

  const isSuccess = params.status === "successful" || params.status === "processed";
  const isFailed = params.status === "rejected" || params.status === "failed";

  const badgeVariant = isSuccess ? "success" : isFailed ? "danger" : "warning";
  const badgeText = `Payout ${statusUpper}`;

  const subject = `NOTARI 2.0: Payout ${params.reference} Update (${statusUpper})`;

  const keyValues: EmailKeyValuePair[] = [
    { label: "Payout Reference", value: params.reference },
    { label: "Settlement Amount", value: formattedAmount },
    { label: "Current Status", value: statusUpper },
  ];

  if (params.bankName && params.accountMasked) {
    keyValues.push({ label: "Destination Account", value: `${params.bankName} (${params.accountMasked})` });
  }

  const alert = isFailed
    ? {
        type: "danger" as const,
        message: `<strong>Notice:</strong> ${params.reason || "Settlement transfer could not be completed. Reserved funds have been returned to your available balance."}`,
      }
    : isSuccess
    ? {
        type: "success" as const,
        message: "✅ Funds have been dispatched to your verified bank account via Paystack transfer.",
      }
    : {
        type: "info" as const,
        message: "Your payout request has been registered and is undergoing administrator settlement approval.",
      };

  const html = renderEmailLayout({
    title: `Payout Request ${statusUpper}`,
    previewText: `Your payout of ${formattedAmount} (${params.reference}) status: ${statusUpper}.`,
    badge: { text: badgeText, variant: badgeVariant },
    leadText: `Hello ${params.organizerName}, here is an update regarding your event proceeds settlement request.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        NOTARI 2.0 processes organizer disbursements with strict financial ledger reconciliation.
      </p>
    `,
    keyValues,
    alert,
    cta: {
      label: "View Payout History",
      url: `${baseUrl}/organizer/payouts`,
      variant: "primary",
    },
  });

  const text = renderPlainText({
    title: `Payout Status: ${statusUpper}`,
    leadText: `Hello ${params.organizerName}, your payout ${params.reference} is now ${statusUpper}.`,
    details: {
      Reference: params.reference,
      Amount: formattedAmount,
      Status: statusUpper,
      Notes: params.reason || (isSuccess ? "Dispatched to bank." : "Under processing."),
    },
    ctaLabel: "View Payouts",
    ctaUrl: `${baseUrl}/organizer/payouts`,
  });

  return { subject, html, text };
}
