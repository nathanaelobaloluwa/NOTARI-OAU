import {
  renderEmailLayout,
  renderKeyValueTable,
  EmailKeyValuePair,
} from "./base-layout";

export interface EventReminderEmailProps {
  studentName: string;
  eventTitle: string;
  eventVenue: string;
  eventDate: Date | string;
  stage: "24h" | "1h" | "custom";
  bookingReference?: string;
  ticketCodes?: string[];
  onlineLink?: string;
  eventUrl?: string;
  customMessage?: string;
}

export function renderEventReminderEmail(props: EventReminderEmailProps): {
  html: string;
  text: string;
  subject: string;
} {
  const {
    studentName,
    eventTitle,
    eventVenue,
    eventDate,
    stage,
    bookingReference,
    ticketCodes,
    onlineLink,
    eventUrl = "https://notari.oau.edu.ng/student/tickets",
    customMessage,
  } = props;

  const dateObj = typeof eventDate === "string" ? new Date(eventDate) : eventDate;
  const formattedDate = dateObj.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const isOneHour = stage === "1h";
  const timeCallout = isOneHour ? "in 1 hour" : "tomorrow";
  const subject = isOneHour
    ? `Starting Soon: "${eventTitle}" begins in 1 hour - NOTARI OAU`
    : `Event Reminder: "${eventTitle}" takes place tomorrow - NOTARI OAU`;

  const keyValues: EmailKeyValuePair[] = [
    { label: "Event", value: eventTitle },
    { label: "Date", value: formattedDate },
    { label: "Time", value: formattedTime },
    { label: "Venue", value: eventVenue },
  ];

  if (onlineLink) {
    keyValues.push({ label: "Meeting Link", value: onlineLink });
  }

  if (bookingReference) {
    keyValues.push({ label: "Booking Ref", value: bookingReference });
  }

  if (ticketCodes && ticketCodes.length > 0) {
    keyValues.push({ label: "Ticket Code(s)", value: ticketCodes.join(", ") });
  }

  const contentHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px; font-size: 15px; color: #1E293B; line-height: 1.6;">
        Hello <strong>${studentName}</strong>,
      </p>
      <p style="margin: 0 0 12px; font-size: 14px; color: #475569; line-height: 1.6;">
        This is a friendly reminder that you have confirmed tickets for <strong>${eventTitle}</strong>, which takes place <strong>${timeCallout}</strong>.
      </p>
      ${
        customMessage
          ? `<div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #1E40AF;">
              <strong>Note from Organizer:</strong> ${customMessage}
            </div>`
          : ""
      }
      <p style="margin: 0; font-size: 13px; color: #64748B;">
        Please arrive at the venue at least 15 minutes before the start time with your digital QR ticket ready for fast gate admission.
      </p>
    </div>

    ${renderKeyValueTable(keyValues)}
  `;

  const html = renderEmailLayout({
    title: isOneHour ? "Your Event Starts in 1 Hour!" : "Event Reminder: Tomorrow!",
    previewText: `Reminder: ${eventTitle} starts ${timeCallout} at ${formattedTime}.`,
    badge: {
      text: isOneHour ? "STARTS IN 1 HOUR" : "TOMORROW",
      variant: isOneHour ? "warning" : "primary",
    },
    leadText: `Get ready for ${eventTitle} at ${eventVenue}.`,
    contentHtml,
    cta: {
      label: "View Digital Ticket & QR Code",
      url: eventUrl,
      variant: "primary",
    },
    footerNote:
      "You are receiving this automated reminder because you hold a confirmed ticket for this OAU campus event. You can manage reminder preferences in your NOTARI student profile.",
  });

  const text = `
NOTARI OAU - EVENT REMINDER
============================================================
Event: ${eventTitle}
Time: ${timeCallout.toUpperCase()} (${formattedDate} at ${formattedTime})
Venue: ${eventVenue}
${onlineLink ? `Online Link: ${onlineLink}\n` : ""}${bookingReference ? `Booking Reference: ${bookingReference}\n` : ""}${ticketCodes?.length ? `Ticket Code(s): ${ticketCodes.join(", ")}\n` : ""}
${customMessage ? `Organizer Note: ${customMessage}\n` : ""}
Hello ${studentName},

This is an automated reminder that you have a confirmed ticket for ${eventTitle}.
Please ensure you arrive with your digital QR ticket for gate check-in.

View your ticket: ${eventUrl}

--
NOTARI 2.0 — Obafemi Awolowo University Event Platform
https://notari.oau.edu.ng
  `.trim();

  return { html, text, subject };
}
