import { z } from "zod";

export const submitPayoutAccountSchema = z.object({
  bankName: z.string().trim().min(2, "Bank name must be at least 2 characters").max(100),
  bankCode: z.string().trim().min(2, "Bank code is required").max(20),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Account number must be exactly 10 digits"),
  accountName: z.string().trim().min(2, "Account name must be at least 2 characters").max(150),
});

export type SubmitPayoutAccountInput = z.infer<typeof submitPayoutAccountSchema>;

export const reviewPayoutAccountSchema = z.object({
  action: z.enum(["approve", "reject", "disable"], {
    errorMap: () => ({ message: "Action must be approve, reject, or disable" }),
  }),
  notes: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
});

export type ReviewPayoutAccountInput = z.infer<typeof reviewPayoutAccountSchema>;

export const createPayoutRequestSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a valid number" })
    .min(100, "Minimum payout request amount is ₦100")
    .max(10000000, "Maximum payout request amount is ₦10,000,000"),
});

export type CreatePayoutRequestInput = z.infer<typeof createPayoutRequestSchema>;

export const reviewPayoutRequestSchema = z.object({
  action: z.enum(["approve", "reject", "process", "mark_successful", "mark_failed"], {
    errorMap: () => ({ message: "Invalid review action" }),
  }),
  notes: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
});

export type ReviewPayoutRequestInput = z.infer<typeof reviewPayoutRequestSchema>;

export const createRefundRequestSchema = z.object({
  bookingId: z.string().trim().min(1, "Booking ID is required"),
  reason: z
    .string()
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type CreateRefundRequestInput = z.infer<typeof createRefundRequestSchema>;

export const reviewRefundRequestSchema = z.object({
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "Action must be approve or reject" }),
  }),
  notes: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(500).optional(),
});

export type ReviewRefundRequestInput = z.infer<typeof reviewRefundRequestSchema>;
