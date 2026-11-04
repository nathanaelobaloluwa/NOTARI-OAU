import { z } from "zod";
import { EVENT_CATEGORIES, EVENT_STATUS } from "@/constants/oau";

const phoneRegex = /^[0-9+() -]{8,20}$/;

export const ticketTierSchema = z.object({
  _id: z.string().optional(),
  name: z.string().trim().min(1, "Tier name is required").max(80, "Tier name too long"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  capacity: z.coerce.number().int().positive("Capacity must be at least 1 ticket"),
  description: z.string().trim().max(500, "Description too long").optional(),
  maxPerOrder: z.coerce.number().int().positive().max(10, "Maximum per order is 10").default(5),
  salesStartDate: z.string().optional().or(z.literal("")),
  salesEndDate: z.string().optional().or(z.literal("")),
});

export type TicketTierInput = z.infer<typeof ticketTierSchema>;

export const baseEventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title too long"),
  summary: z.string().trim().max(300, "Summary too long").optional(),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(5000, "Description too long"),
  category: z.enum(EVENT_CATEGORIES, {
    errorMap: () => ({ message: "Please select a valid event category" }),
  }),
  eventType: z.enum(["physical", "online", "hybrid"]).default("physical"),
  faculty: z.string().trim().optional(),
  department: z.string().trim().max(120).optional(),
  venue: z.string().trim().min(2, "Venue is required").max(120, "Venue name too long"),
  address: z.string().trim().max(250).optional(),
  onlineDetails: z
    .object({
      platform: z.string().trim().optional(),
      link: z.string().trim().optional(),
      accessInfo: z.string().trim().optional(),
    })
    .optional(),
  targetAudience: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim()).optional(),
  contactEmail: z.string().trim().email("Please provide a valid contact email").toLowerCase().optional().or(z.literal("")),
  contactPhone: z.string().trim().regex(phoneRegex, "Please enter a valid phone number").optional().or(z.literal("")),
  instructions: z.string().trim().max(1000).optional(),
  startDate: z.string().min(1, "Start date and time are required"),
  endDate: z.string().min(1, "End date and time are required"),
  salesStartDate: z.string().optional().or(z.literal("")),
  salesEndDate: z.string().optional().or(z.literal("")),
  flyerUrl: z.string().trim().optional().or(z.literal("")),
  flyerImage: z.string().trim().optional().or(z.literal("")),
  galleryUrls: z.array(z.string().trim()).optional(),
  isFree: z.boolean().default(true),
  ticketTiers: z.array(ticketTierSchema).min(1, "At least one ticket tier is required"),
  status: z.enum([EVENT_STATUS.DRAFT, EVENT_STATUS.PENDING_APPROVAL]).default(EVENT_STATUS.DRAFT),
});

export const createEventSchema = baseEventSchema
  .refine(
    (data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      if (!isNaN(start) && !isNaN(end)) {
        return end > start;
      }
      return true;
    },
    {
      message: "Event end date and time must be after start date and time",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (data.isFree) {
        return data.ticketTiers.every((t) => t.price === 0);
      }
      return true;
    },
    {
      message: "Free events cannot have ticket tiers with a price greater than 0",
      path: ["ticketTiers"],
    }
  )
  .refine(
    (data) => {
      if (!data.isFree) {
        return data.ticketTiers.some((t) => t.price > 0);
      }
      return true;
    },
    {
      message: "Paid events must have at least one ticket tier with a price greater than 0",
      path: ["ticketTiers"],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = baseEventSchema.partial().refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      if (!isNaN(start) && !isNaN(end)) {
        return end > start;
      }
    }
    return true;
  },
  {
    message: "Event end date and time must be after start date and time",
    path: ["endDate"],
  }
);
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const adminEventReviewSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
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
  );

export type AdminEventReviewInput = z.infer<typeof adminEventReviewSchema>;

export const eventFilterSchema = z.object({
  search: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  category: z
    .string()
    .optional()
    .transform((v) => (v && v !== "all" && v.trim().length > 0 ? v.trim() : undefined)),
  faculty: z
    .string()
    .optional()
    .transform((v) => (v && v !== "all" && v.trim().length > 0 ? v.trim() : undefined)),
  date: z
    .enum(["all", "today", "this_week", "this_month", ""])
    .optional()
    .transform((v) => (v === "" || v === "all" ? undefined : v)),
  isFree: z
    .enum(["true", "false", "all", ""])
    .optional()
    .transform((v) => (v === "" || v === "all" ? undefined : v)),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(9),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;

export const organizerEventFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type OrganizerEventFilterInput = z.infer<typeof organizerEventFilterSchema>;
