import {
  renderEmailLayout,
  renderKeyValueTable,
  EmailKeyValuePair,
} from "./base-layout";

export interface CampusAnnouncementEmailProps {
  recipientName: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  authorName?: string;
  announcementUrl?: string;
  eventTitle?: string;
}

export function renderCampusAnnouncementEmail(props: CampusAnnouncementEmailProps): {
  html: string;
  text: string;
  subject: string;
} {
  const {
    recipientName,
    title,
    summary,
    content,
    category,
    priority,
    authorName = "OAU Administration",
    announcementUrl = "https://notari.oau.edu.ng/student/announcements",
    eventTitle,
  } = props;

  const isUrgent = priority === "urgent";
  const isHigh = priority === "high";

  const prefix = isUrgent ? "[URGENT] " : isHigh ? "[IMPORTANT] " : "";
  const subject = `${prefix}${title} - NOTARI OAU`;

  const categoryLabels: Record<string, string> = {
    general_news: "Campus News",
    academic_updates: "Academic Notice",
    student_affairs: "Student Affairs",
    faculty_announcements: "Faculty Notice",
    departmental_updates: "Departmental Update",
    campus_events: "Campus Event",
    emergency_notices: "Emergency Notice",
    opportunities: "Opportunity",
    scholarships_competitions: "Scholarship & Competition",
  };

  const formattedCategory = categoryLabels[category] || "Announcement";

  const keyValues: EmailKeyValuePair[] = [
    { label: "Category", value: formattedCategory },
    { label: "Posted By", value: authorName },
    { label: "Priority", value: priority.toUpperCase() },
  ];

  if (eventTitle) {
    keyValues.push({ label: "Related Event", value: eventTitle });
  }

  const badgeVariant = isUrgent
    ? "danger"
    : isHigh
    ? "warning"
    : priority === "low"
    ? "neutral"
    : "primary";

  const contentHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px; font-size: 15px; color: #1E293B; line-height: 1.6;">
        Hello <strong>${recipientName}</strong>,
      </p>
      <div style="background-color: #FFFFFF; border-left: 4px solid #4F46E5; padding: 14px 18px; margin: 16px 0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #1E293B;">
          ${summary}
        </p>
      </div>
      <div style="font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap; margin-top: 16px;">
        ${content}
      </div>
    </div>

    ${renderKeyValueTable(keyValues)}
  `;

  const html = renderEmailLayout({
    title,
    previewText: summary.slice(0, 140),
    badge: {
      text: `${formattedCategory.toUpperCase()} • ${priority.toUpperCase()}`,
      variant: badgeVariant,
    },
    leadText: `Official announcement from ${authorName}.`,
    contentHtml,
    cta: {
      label: "View Announcement on NOTARI",
      url: announcementUrl,
      variant: isUrgent ? "primary" : "primary",
    },
    footerNote:
      "You are receiving this campus announcement based on your OAU student status. You can update your announcement notification preferences in your profile settings.",
  });

  const text = `
NOTARI OAU - CAMPUS ANNOUNCEMENT
============================================================
${title}
Category: ${formattedCategory} | Priority: ${priority.toUpperCase()} | By: ${authorName}
${eventTitle ? `Related Event: ${eventTitle}\n` : ""}
Summary:
${summary}

Details:
${content}

Read full announcement on NOTARI: ${announcementUrl}

--
NOTARI 2.0 — Obafemi Awolowo University Event Platform
https://notari.oau.edu.ng
  `.trim();

  return { html, text, subject };
}

export interface OrganizerEventBroadcastEmailProps {
  attendeeName: string;
  eventTitle: string;
  updateType: "general" | "venue_change" | "time_change" | "cancellation" | "instructions";
  subjectLine: string;
  message: string;
  organizerName: string;
  eventUrl?: string;
  newVenue?: string;
  newTime?: string;
}

export function renderOrganizerEventBroadcastEmail(props: OrganizerEventBroadcastEmailProps): {
  html: string;
  text: string;
  subject: string;
} {
  const {
    attendeeName,
    eventTitle,
    updateType,
    subjectLine,
    message,
    organizerName,
    eventUrl = "https://notari.oau.edu.ng/student/tickets",
    newVenue,
    newTime,
  } = props;

  const isCancelled = updateType === "cancellation";
  const badgeText = isCancelled
    ? "EVENT CANCELLED"
    : updateType === "venue_change"
    ? "VENUE UPDATE"
    : updateType === "time_change"
    ? "SCHEDULE UPDATE"
    : "EVENT UPDATE";

  const badgeVariant = isCancelled
    ? "danger"
    : updateType === "time_change" || updateType === "venue_change"
    ? "warning"
    : "primary";

  const keyValues: EmailKeyValuePair[] = [
    { label: "Event", value: eventTitle },
    { label: "Organizer", value: organizerName },
    { label: "Update Type", value: badgeText },
  ];

  if (newVenue) {
    keyValues.push({ label: "Updated Venue", value: newVenue });
  }

  if (newTime) {
    keyValues.push({ label: "Updated Time", value: newTime });
  }

  const contentHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 12px; font-size: 15px; color: #1E293B; line-height: 1.6;">
        Hello <strong>${attendeeName}</strong>,
      </p>
      <p style="margin: 0 0 12px; font-size: 14px; color: #475569; line-height: 1.6;">
        The organizer for <strong>${eventTitle}</strong> has issued an important notice regarding your registered attendance:
      </p>
      <div style="background-color: #FFFFFF; border-left: 4px solid ${isCancelled ? "#EF4444" : "#4F46E5"}; padding: 14px 18px; margin: 16px 0; border-radius: 6px;">
        <p style="margin: 0; font-size: 14px; color: #1E293B; line-height: 1.7; white-space: pre-wrap;">
          ${message}
        </p>
      </div>
    </div>

    ${renderKeyValueTable(keyValues)}
  `;

  const html = renderEmailLayout({
    title: subjectLine,
    previewText: `Important update regarding ${eventTitle} from ${organizerName}.`,
    badge: {
      text: badgeText,
      variant: badgeVariant,
    },
    leadText: `Notice for attendees of ${eventTitle}.`,
    contentHtml,
    cta: {
      label: "View Event & Ticket",
      url: eventUrl,
      variant: "primary",
    },
    footerNote:
      "You are receiving this update because you are registered as an attendee for this event on NOTARI OAU.",
  });

  const text = `
NOTARI OAU - EVENT ATTENDEE UPDATE
============================================================
${subjectLine}
Event: ${eventTitle}
Organizer: ${organizerName}
Notice Type: ${badgeText}
${newVenue ? `Updated Venue: ${newVenue}\n` : ""}${newTime ? `Updated Time: ${newTime}\n` : ""}
Message from Organizer:
${message}

View event details: ${eventUrl}

--
NOTARI 2.0 — Obafemi Awolowo University Event Platform
https://notari.oau.edu.ng
  `.trim();

  return { html, text, subject: `${subjectLine} - NOTARI OAU` };
}
