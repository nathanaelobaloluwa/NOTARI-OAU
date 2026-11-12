import { z } from "zod";

export const studentProfileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name too long"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^[0-9+() -]{8,20}$/.test(val), {
      message: "Please enter a valid phone number (e.g., 08012345678 or +234...)",
    }),
  faculty: z.string().trim().optional(),
  department: z.string().trim().optional(),
  emailPreferences: z
    .object({
      eventReminders: z.boolean().optional(),
      campusAnnouncements: z.boolean().optional(),
    })
    .optional(),
});

export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password cannot be the same as your current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const studentHistoryQuerySchema = z.object({
  tab: z.enum(["all", "upcoming", "attended", "past"]).optional().default("all"),
});

export type StudentHistoryQueryInput = z.infer<typeof studentHistoryQuerySchema>;
