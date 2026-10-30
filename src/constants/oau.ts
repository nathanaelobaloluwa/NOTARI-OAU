export const OAU_FACULTIES = [
  "Administration",
  "Agriculture",
  "Arts",
  "Basic Medical Sciences",
  "Clinical Sciences",
  "Dentistry",
  "Education",
  "Environmental Design and Management",
  "Law",
  "Pharmacy",
  "Science",
  "Social Sciences",
  "Technology",
] as const;

export type OauFaculty = (typeof OAU_FACULTIES)[number];

export const EVENT_CATEGORIES = [
  "Academic & Educational",
  "Tech & Innovation",
  "Music & Concerts",
  "Arts & Culture",
  "Sports & Recreation",
  "Career & Professional",
  "Health & Wellness",
  "Religious & Spiritual",
  "Social & Entertainment",
  "Other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const OAU_VENUES = [
  "Oduduwa Hall",
  "Amphi Theatre",
  "Sports Complex",
  "Hezekiah Oluwasanmi Library Lawn",
  "Sub Car Park",
  "Health Sciences Auditorium",
  "Faculty of Arts Building Room 101",
  "Faculty of Technology White House",
  "Engineering Lecture Theatre 1 & 2",
  "BOOC / BOOT (Bisi Onabanjo Building)",
  "OAU International Conference Centre",
  "PG Hall Quadrangle",
  "Awolowo Hall Quadrangle",
  "Angola / Mozambique Quadrangle",
  "Moremi Hall Car Park",
] as const;

export type OauVenue = (typeof OAU_VENUES)[number];

export const EVENT_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  PUBLISHED: "published",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];
