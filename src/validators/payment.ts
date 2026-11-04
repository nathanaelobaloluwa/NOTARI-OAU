import { z } from "zod";
import crypto from "crypto";
import { PAYMENT_STATUS } from "@/models/Payment";

export const initializePaymentSchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required"),
  ticketTierId: z.string().trim().min(1, "Ticket tier ID is required"),
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(10, "Maximum 10 tickets allowed per order")
    .default(1),
  callbackUrl: z.string().url().optional(),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;

export const verifyPaymentQuerySchema = z.object({
  reference: z.string().trim().min(5, "Payment reference is required"),
});

export type VerifyPaymentQueryInput = z.infer<typeof verifyPaymentQuerySchema>;

export const adminPaymentFilterSchema = z.object({
  status: z
    .enum(["all", ...Object.values(PAYMENT_STATUS)])
    .default("all"),
  search: z.string().trim().optional(),
  eventId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

export type AdminPaymentFilterInput = z.infer<typeof adminPaymentFilterSchema>;

/**
 * Generates an unpredictable, cryptographically random payment reference.
 * Pattern: NOT-PAY-YYYYMMDD-XXXXXXXX (e.g. NOT-PAY-20261104-9F8A1B2C)
 */
export function generatePaymentReference(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const entropy = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `NOT-PAY-${yyyy}${mm}${dd}-${entropy}`;
}

