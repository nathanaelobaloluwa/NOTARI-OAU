import { z } from "zod";

export const verifyAndCheckInSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  ticketCode: z.string().min(1, "Ticket code is required").transform((val) => val.trim().toUpperCase()),
  signature: z.string().optional(),
  scanMode: z.enum(["qr", "manual", "offline_sync"]).default("qr"),
  offlineTimestamp: z.string().datetime().optional(),
});

export type VerifyAndCheckInInput = z.infer<typeof verifyAndCheckInSchema>;

export const checkInAttendeeQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "checked_in", "pending"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CheckInAttendeeQueryInput = z.infer<typeof checkInAttendeeQuerySchema>;

