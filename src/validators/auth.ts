import { z } from "zod";
import { USER_ROLES } from "@/constants/roles";
import { OAU_FACULTIES } from "@/constants/oau";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .refine(
      (email) => email.endsWith(".edu.ng") || email.endsWith("@gmail.com") || email.includes("oau"),
      {
        message: "University or valid email preferred (e.g., student@oau.edu.ng)",
      }
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum([USER_ROLES.STUDENT, USER_ROLES.ORGANIZER]).default(USER_ROLES.STUDENT),
  matricNumber: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const organizerApplicationSchema = z.object({
  organizationName: z.string().min(3, "Organization name must be at least 3 characters"),
  category: z.string().min(2, "Category is required"),
  description: z.string().min(20, "Provide a brief description (min 20 characters)"),
  contactEmail: z.string().email("Valid contact email is required"),
  contactPhone: z.string().min(10, "Valid phone number is required"),
  faculty: z.enum(OAU_FACULTIES).optional(),
});

export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;
