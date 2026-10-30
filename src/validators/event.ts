import { z } from "zod";
import { EVENT_CATEGORIES, EVENT_STATUS, OAU_FACULTIES } from "@/constants/oau";

export const ticketTierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  price: z.number().min(0, "Price cannot be negative"),
  capacity: z.number().int().positive("Capacity must be greater than zero"),
  description: z.string().optional(),
  maxPerOrder: z.number().int().positive().default(5),
});

export const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.enum(EVENT_CATEGORIES),
  faculty: z.enum(OAU_FACULTIES).optional(),
  venue: z.string().min(2, "Venue is required"),
  address: z.string().optional(),
  startDate: z.string().min(1, "Start date and time are required"),
  endDate: z.string().min(1, "End date and time are required"),
  flyerUrl: z.string().url().optional(),
  isFree: z.boolean().default(true),
  ticketTiers: z.array(ticketTierSchema).min(1, "At least one ticket tier is required"),
  status: z.enum([EVENT_STATUS.DRAFT, EVENT_STATUS.PENDING_APPROVAL]).default(EVENT_STATUS.DRAFT),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const eventFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  faculty: z.string().optional(),
  date: z.enum(["all", "today", "this_week", "this_month"]).optional(),
  isFree: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;
