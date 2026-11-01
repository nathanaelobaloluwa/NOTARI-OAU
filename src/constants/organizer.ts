export const APPLICANT_TYPES = {
  INDIVIDUAL: "individual",
  ORGANIZATION: "organization",
} as const;

export type ApplicantType = (typeof APPLICANT_TYPES)[keyof typeof APPLICANT_TYPES];

export const APPLICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "changes_requested",
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

export const ORGANIZATION_CATEGORIES = [
  "Association",
  "Department",
  "Student Union",
  "Faculty Group",
  "Club",
  "Society",
  "Other",
] as const;

export type OrganizationCategory = (typeof ORGANIZATION_CATEGORIES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [APPLICATION_STATUS.PENDING]: "Pending Review",
  [APPLICATION_STATUS.APPROVED]: "Approved",
  [APPLICATION_STATUS.REJECTED]: "Application Rejected",
  [APPLICATION_STATUS.CHANGES_REQUESTED]: "Changes Requested",
};

