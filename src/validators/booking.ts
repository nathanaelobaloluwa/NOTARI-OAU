import { z } from "zod";
import crypto from "crypto";

export const freeRegistrationSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  ticketTierId: z.string().min(1, "Ticket tier ID is required"),
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(5, "Maximum 5 tickets allowed per registration")
    .default(1),
});

export type FreeRegistrationInput = z.infer<typeof freeRegistrationSchema>;

/**
 * Generate a unique, formatted booking reference e.g. "NOT-2026-F89A12CD"
 */
export function generateBookingReference(year: number = new Date().getFullYear()): string {
  const entropy = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `NOT-${year}-${entropy}`;
}
