export const USER_ROLES = {
  STUDENT: "student",
  ORGANIZER: "organizer",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.STUDENT]: "Student",
  [USER_ROLES.ORGANIZER]: "Event Organizer",
  [USER_ROLES.ADMIN]: "Super Administrator",
};

export const ORGANIZER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
} as const;

export type OrganizerStatus = (typeof ORGANIZER_STATUS)[keyof typeof ORGANIZER_STATUS];
