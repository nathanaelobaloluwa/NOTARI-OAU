import { env } from "@/config/env";
import {
  renderEmailLayout,
  renderPlainText,
  EmailKeyValuePair,
  EmailAlert,
} from "./base-layout";

function getBaseUrl(customUrl?: string): string {
  return customUrl || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export interface RefundNotificationParams {
  studentEmail: string;
  studentName: string;
  reference: string;
  bookingReference?: string;
  eventTitle?: string;
  amountInNaira: number;
  status: "pending" | "approved" | "processing" | "successful" | "rejected";
  reason?: string;
  appUrl?: string;
}

/**
 * Renders Student Refund Request Confirmation & Status Update Emails
 */
export function renderRefundStatusEmail(params: RefundNotificationParams) {
  const baseUrl = getBaseUrl(params.appUrl);
  const formattedAmount = `₦${params.amountInNaira.toLocaleString("en-NG")}`;
  const statusUpper = params.status.toUpperCase();

  const keyValues: EmailKeyValuePair[] = [
    { label: "Refund Reference", value: params.reference },
    { label: "Refund Amount", value: formattedAmount },
    { label: "Current Status", value: statusUpper },
  ];

  if (params.eventTitle) {
    keyValues.unshift({ label: "Event", value: params.eventTitle });
  }

  if (params.bookingReference) {
    keyValues.push({ label: "Original Booking Ref", value: params.bookingReference });
  }

  let title = "Ticket Refund Status Update";
  let preview = `Your refund request ${params.reference} status: ${statusUpper}.`;
  let leadText = `Hello ${params.studentName}, here is an update on your ticket refund request.`;
  let badgeVariant: "primary" | "success" | "warning" | "danger" = "primary";
  let alert: EmailAlert = {
    type: "info",
    message: "Your refund request is being processed in accordance with university event ticketing policies.",
  };

  switch (params.status) {
    case "pending":
      title = "Refund Request Received";
      preview = `We have received your refund request of ${formattedAmount} (${params.reference}).`;
      leadText = `Hello ${params.studentName}, we have received your ticket refund request for <strong>${formattedAmount}</strong>.`;
      badgeVariant = "primary";
      alert = {
        type: "info",
        message:
          "⏳ <strong>Under Review:</strong> Superadmins review refund requests before events begin. You will be notified as soon as a decision is recorded.",
      };
      break;

    case "approved":
      title = "Refund Request Approved";
      preview = `Your refund request of ${formattedAmount} has been approved by the administrator.`;
      leadText = `Hello ${params.studentName}, your refund request of <strong>${formattedAmount}</strong> has been approved.`;
      badgeVariant = "warning";
      alert = {
        type: "warning",
        message:
          "⚠️ <strong>Awaiting Gateway Processing:</strong> Your refund has been approved by the university administrator and is queued for transfer execution with Paystack. Funds typically reflect in your bank account within 3 to 5 business days once processed.",
      };
      break;

    case "processing":
      title = "Refund In Process";
      preview = `Your refund of ${formattedAmount} is currently being processed by the payment gateway.`;
      leadText = `Hello ${params.studentName}, your refund of <strong>${formattedAmount}</strong> is currently being processed by the payment provider.`;
      badgeVariant = "warning";
      alert = {
        type: "warning",
        message:
          "🏦 <strong>Transfer in Progress:</strong> Paystack is routing the funds back to your original source payment channel.",
      };
      break;

    case "successful":
      title = "Refund Successfully Processed";
      preview = `Your refund of ${formattedAmount} has been successfully processed to your account.`;
      leadText = `Hello ${params.studentName}, your ticket refund of <strong>${formattedAmount}</strong> has been successfully processed.`;
      badgeVariant = "success";
      alert = {
        type: "success",
        message:
          "✅ <strong>Settlement Completed:</strong> The refund has been dispatched back to the card or bank account used during checkout. Associated tickets have been invalidated.",
      };
      break;

    case "rejected":
      title = "Refund Request Declined";
      preview = `Your refund request ${params.reference} was not approved.`;
      leadText = `Hello ${params.studentName}, your refund request could not be approved at this time.`;
      badgeVariant = "danger";
      alert = {
        type: "danger",
        message: `<strong>Reason:</strong> ${params.reason || "Refund request did not meet university refund policy criteria (e.g., event already commenced or non-refundable tier)."}`
      };
      break;
  }

  const subject = `NOTARI 2.0: Ticket Refund ${params.reference} Update (${statusUpper})`;

  const html = renderEmailLayout({
    title,
    previewText: preview,
    badge: { text: `Refund ${statusUpper}`, variant: badgeVariant },
    leadText,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Review the refund transaction details and gateway status below.
      </p>
    `,
    keyValues,
    alert,
    cta: {
      label: "View Purchase History",
      url: `${baseUrl}/student/history`,
      variant: "primary",
    },
    footerNote:
      "This is an automated notification of ticket refund settlement. Financial ledger debits and gateway transfers are monitored by Obafemi Awolowo University Event Audits.",
  });

  const text = renderPlainText({
    title,
    leadText,
    details: {
      Reference: params.reference,
      Amount: formattedAmount,
      Status: statusUpper,
      Notes: params.reason || alert.message.replace(/<[^>]+>/g, ""),
    },
    ctaLabel: "View Purchase History",
    ctaUrl: `${baseUrl}/student/history`,
  });

  return { subject, html, text };
}
