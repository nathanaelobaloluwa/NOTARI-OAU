import { env } from "@/config/env";
import {
  renderEmailLayout,
  renderPlainText,
  EmailKeyValuePair,
} from "./base-layout";

export interface TicketSummaryInfo {
  code: string;
  signature?: string;
  qrCodeUrl?: string;
}

export interface FreeTicketEmailParams {
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
  appUrl?: string;
}

export interface PaidTicketEmailParams {
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
  appUrl?: string;
}

function formatDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return d.toLocaleDateString("en-NG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateInput);
  }
}

function formatKobo(kobo: number): string {
  const naira = Math.floor(kobo / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

/**
 * Generates Free Ticket Confirmation Email (HTML & Plain Text)
 */
export function renderFreeTicketEmail(params: FreeTicketEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = params.appUrl || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ticketsUrl = `${baseUrl}/student/tickets`;
  const formattedDate = formatDate(params.eventDate);
  const ticketCodesDisplay = params.ticketCodes.join(", ");

  const subject = `Your Ticket for ${params.eventTitle} - NOTARI OAU`;

  const keyValues: EmailKeyValuePair[] = [
    { label: "Event", value: params.eventTitle },
    { label: "Venue", value: params.eventVenue },
    { label: "Date & Time", value: formattedDate },
    { label: "Ticket Tier", value: `${params.tierName} (Free)` },
    { label: "Quantity", value: `${params.quantity} Ticket(s)` },
    { label: "Booking Reference", value: params.bookingReference },
    { label: "Ticket Code(s)", value: ticketCodesDisplay },
  ];

  const html = renderEmailLayout({
    title: "Your Ticket is Confirmed!",
    previewText: `You are confirmed for ${params.eventTitle}. View your ticket: ${ticketCodesDisplay}`,
    badge: { text: "Free Registration", variant: "success" },
    leadText: `Hello ${params.studentName || "Student"}, your free registration for ${params.eventTitle} has been confirmed.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Your digital ticket is ready. Please present your digital QR pass from your student dashboard or the ticket code below at the door for entry.
      </p>
      <div style="background-color: #EEF2FF; border: 1px dashed #6366F1; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; color: #4338CA; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px;">Authentic Ticket Code</span>
        <span style="font-family: monospace; font-size: 16px; font-weight: 800; color: #1E1B4B; letter-spacing: 0.05em;">${ticketCodesDisplay}</span>
      </div>
    `,
    keyValues,
    alert: {
      type: "info",
      message:
        "💡 <strong>Event Day Door Operations:</strong> Please arrive on time. Gate check-in attendants will scan your cryptographic QR pass to verify admission.",
    },
    cta: {
      label: "View My Digital Tickets",
      url: ticketsUrl,
      variant: "primary",
    },
    footerNote:
      "This is an automated confirmation of your event registration on NOTARI 2.0. Digital passes are cryptographic and non-transferable.",
  });

  const text = renderPlainText({
    title: `Ticket Confirmed: ${params.eventTitle}`,
    leadText: `Hello ${params.studentName || "Student"}, your free ticket registration for ${params.eventTitle} is confirmed.`,
    details: {
      Event: params.eventTitle,
      Venue: params.eventVenue,
      "Date & Time": formattedDate,
      "Ticket Tier": `${params.tierName} (Free)`,
      Quantity: `${params.quantity} ticket(s)`,
      "Booking Reference": params.bookingReference,
      "Ticket Code(s)": ticketCodesDisplay,
    },
    ctaLabel: "View Digital Tickets",
    ctaUrl: ticketsUrl,
    extraText: "Present your ticket code or QR pass from your dashboard at the venue gate for check-in.",
  });

  return { subject, html, text };
}

/**
 * Generates Paid Ticket Purchase Receipt Email (HTML & Plain Text)
 */
export function renderPaidTicketReceiptEmail(params: PaidTicketEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = params.appUrl || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ticketsUrl = `${baseUrl}/student/tickets`;
  const formattedDate = formatDate(params.eventDate);
  const formattedPaidDate = formatDate(params.paidAt);
  const formattedAmount = formatKobo(params.amountInKobo);
  const ticketCodesDisplay = params.ticketCodes.join(", ");

  const subject = `Receipt & Digital Tickets: ${params.eventTitle} - NOTARI OAU`;

  const keyValues: EmailKeyValuePair[] = [
    { label: "Event", value: params.eventTitle },
    { label: "Venue", value: params.eventVenue },
    { label: "Event Date", value: formattedDate },
    { label: "Ticket Tier", value: params.tierName },
    { label: "Quantity", value: `${params.quantity} Ticket(s)` },
    { label: "Total Paid", value: formattedAmount },
    { label: "Payment Reference", value: params.paymentReference },
    { label: "Booking Reference", value: params.bookingReference },
    { label: "Purchase Date", value: formattedPaidDate },
    { label: "Ticket Code(s)", value: ticketCodesDisplay },
  ];

  const html = renderEmailLayout({
    title: "Payment Received & Tickets Issued",
    previewText: `Payment of ${formattedAmount} verified for ${params.eventTitle}. Your tickets: ${ticketCodesDisplay}`,
    badge: { text: "Verified Payment", variant: "success" },
    leadText: `Hello ${params.studentName || "Student"}, your payment of <strong>${formattedAmount}</strong> has been confirmed. Your digital tickets are ready.`,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Thank you for purchasing tickets on NOTARI 2.0. Below is your official university receipt and ticket codes.
      </p>
      <div style="background-color: #ECFDF5; border: 1px dashed #10B981; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; color: #065F46; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px;">Official Ticket Code(s)</span>
        <span style="font-family: monospace; font-size: 16px; font-weight: 800; color: #064E3B; letter-spacing: 0.05em;">${ticketCodesDisplay}</span>
      </div>
    `,
    keyValues,
    alert: {
      type: "info",
      message:
        "🛡️ <strong>HMAC Security:</strong> Your tickets include tamper-proof cryptographic QR codes. Open your student portal on your mobile device at the venue gate for swift check-in.",
    },
    cta: {
      label: "Access Digital QR Passes",
      url: ticketsUrl,
      variant: "primary",
    },
    secondaryCta: {
      label: "Purchase History",
      url: `${baseUrl}/student/history`,
      variant: "secondary",
    },
    footerNote:
      "This email serves as your official payment receipt from Obafemi Awolowo University Event Services. Transactions are verified server-side via Paystack.",
  });

  const text = renderPlainText({
    title: `Payment Receipt: ${params.eventTitle}`,
    leadText: `Hello ${params.studentName || "Student"}, your payment of ${formattedAmount} for ${params.eventTitle} is confirmed.`,
    details: {
      Event: params.eventTitle,
      Venue: params.eventVenue,
      "Event Date": formattedDate,
      "Ticket Tier": params.tierName,
      Quantity: `${params.quantity} ticket(s)`,
      "Total Amount Paid": formattedAmount,
      "Payment Reference": params.paymentReference,
      "Booking Reference": params.bookingReference,
      "Payment Date": formattedPaidDate,
      "Ticket Code(s)": ticketCodesDisplay,
    },
    ctaLabel: "Access Digital QR Tickets",
    ctaUrl: ticketsUrl,
    extraText: "Present your cryptographic ticket pass on your mobile screen at the event door.",
  });

  return { subject, html, text };
}
