import { z } from "zod";
import { ORGANIZATION_CATEGORIES, OrganizationCategory } from "@/constants/organizer";

const phoneRegex = /^[0-9+() -]{8,20}$/;

export const individualApplicationSchema = z.object({
  applicantType: z.literal("individual"),
  applicantName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name too long"),
  applicantEmail: z
    .string()
    .trim()
    .email("Valid email address is required")
    .toLowerCase(),
  applicantMatricNumber: z.string().trim().optional(),
  faculty: z.string().trim().min(1, "Faculty is required"),
  department: z.string().trim().min(1, "Department is required"),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number is required")
    .regex(phoneRegex, "Please enter a valid phone number (e.g., 08012345678 or +234...)"),
  displayName: z
    .string()
    .trim()
    .min(2, "Organizer display name or brand must be at least 2 characters")
    .max(100, "Display name too long"),
  description: z
    .string()
    .trim()
    .min(20, "Biography / profile description must be at least 20 characters")
    .max(1000, "Description too long"),
  reason: z
    .string()
    .trim()
    .min(20, "Please explain why you want to become an organizer (at least 20 characters)")
    .max(1000, "Reason too long"),
  experience: z.string().trim().max(1000, "Experience notes too long").optional(),
  supportingLinks: z.string().trim().max(500, "Links too long").optional(),
});

export type IndividualApplicationInput = z.infer<typeof individualApplicationSchema>;

export const organizationApplicationSchema = z.object({
  applicantType: z.literal("organization"),
  organizationName: z
    .string()
    .trim()
    .min(2, "Official organization name must be at least 2 characters")
    .max(120, "Organization name too long"),
  organizationCategory: z.enum(
    ORGANIZATION_CATEGORIES as unknown as [OrganizationCategory, ...OrganizationCategory[]],
    {
      errorMap: () => ({ message: "Please select a valid organization category" }),
    }
  ),
  organizationDescription: z
    .string()
    .trim()
    .min(20, "Organization description must be at least 20 characters")
    .max(1000, "Description too long"),
  faculty: z.string().trim().optional(),
  department: z.string().trim().optional(),
  contactPersonName: z
    .string()
    .trim()
    .min(2, "Contact person's full name is required")
    .max(100, "Contact person name too long"),
  contactPersonEmail: z
    .string()
    .trim()
    .email("Valid contact person email is required")
    .toLowerCase(),
  contactPersonMatric: z.string().trim().optional(),
  contactPersonPhone: z
    .string()
    .trim()
    .min(8, "Contact phone number is required")
    .regex(phoneRegex, "Please enter a valid phone number (e.g., 08012345678 or +234...)"),
  officialEmail: z
    .string()
    .trim()
    .email("Enter a valid official email address")
    .toLowerCase()
    .optional()
    .or(z.literal("")),
  reason: z
    .string()
    .trim()
    .min(20, "Reason for requesting organizer access must be at least 20 characters")
    .max(1000, "Reason too long"),
  supportingLinks: z.string().trim().max(500, "Links too long").optional(),
});

export type OrganizationApplicationInput = z.infer<typeof organizationApplicationSchema>;

export const organizerApplicationSchema = z.discriminatedUnion("applicantType", [
  individualApplicationSchema,
  organizationApplicationSchema,
]);

export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;

export const applicationReviewSchema = z
  .object({
    action: z.enum(["approve", "reject", "request_changes"]),
    reason: z.string().trim().optional(),
    reviewNotes: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.action === "reject") {
        return !!data.reason && data.reason.trim().length >= 5;
      }
      return true;
    },
    {
      message: "A rejection reason of at least 5 characters is required",
      path: ["reason"],
    }
  )
  .refine(
    (data) => {
      if (data.action === "request_changes") {
        return !!data.reason && data.reason.trim().length >= 5;
      }
      return true;
    },
    {
      message: "Please explain the requested changes (at least 5 characters)",
      path: ["reason"],
    }
  );

export type ApplicationReviewInput = z.infer<typeof applicationReviewSchema>;

export const organizerProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name too long")
    .optional(),
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(120, "Organization name too long")
    .optional(),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description too long")
    .optional(),
  contactEmail: z
    .string()
    .trim()
    .email("Please provide a valid contact email")
    .toLowerCase()
    .optional(),
  contactPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Please enter a valid phone number")
    .optional(),
  faculty: z.string().trim().optional(),
  department: z.string().trim().optional(),
  website: z
    .string()
    .trim()
    .url("Please enter a valid URL (including https://)")
    .optional()
    .or(z.literal("")),
  socialLinks: z
    .object({
      twitter: z.string().trim().optional(),
      instagram: z.string().trim().optional(),
      linkedin: z.string().trim().optional(),
    })
    .optional(),
});

export type OrganizerProfileUpdateInput = z.infer<typeof organizerProfileUpdateSchema>;
