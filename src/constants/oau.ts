export const OAU_FACULTIES = [
  "Administration",
  "Agriculture",
  "Arts",
  "Basic Medical Sciences",
  "Clinical Sciences",
  "Dentistry",
  "Education",
  "Environmental Design and Management",
  "Faculty of Computing Science and Engineering",
  "Law",
  "Pharmacy",
  "Science",
  "Social Sciences",
  "Technology",
] as const;

export type OauFaculty = (typeof OAU_FACULTIES)[number];

/**
 * All recognized faculty names including shorthand aliases and canonical forms.
 * Used for tolerant backend validation so that legacy records or variations
 * ("Computing Science and Engineering" vs "Faculty of Computing Science and Engineering")
 * validate and persist safely.
 */
export const ALL_VALID_FACULTIES = [
  ...OAU_FACULTIES,
  "Computing Science and Engineering",
] as const;

/**
 * Normalizes faculty name into standard canonical format.
 * Maps "Computing Science and Engineering" -> "Faculty of Computing Science and Engineering".
 */
export function normalizeFaculty(faculty?: string | null): string | undefined {
  if (!faculty) return undefined;
  const trimmed = faculty.trim();
  if (!trimmed) return undefined;
  if (/^(Faculty of )?Computing Science and Engineering$/i.test(trimmed)) {
    return "Faculty of Computing Science and Engineering";
  }
  return trimmed;
}

/**
 * Formats a faculty for display in UI dropdowns and labels.
 * If already prefixed with "Faculty of ", returns as-is; otherwise adds "Faculty of ".
 */
export function formatFacultyLabel(faculty: string): string {
  if (!faculty) return "";
  return faculty.startsWith("Faculty of ") ? faculty : `Faculty of ${faculty}`;
}

/**
 * Builds a regex pattern to match a faculty flexibly in MongoDB queries,
 * matching both with and without the "Faculty of " prefix.
 */
export function buildFacultyQueryRegex(faculty: string): RegExp {
  const clean = faculty.replace(/^Faculty of\s+/i, "").trim();
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(Faculty of\\s+)?${escaped}$`, "i");
}

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
