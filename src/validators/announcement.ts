import { z } from "zod";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  AUDIENCE_TYPES,
  ANNOUNCEMENT_STATUSES,
} from "@/models/Announcement";

export const targetAudienceSchema = z.object({
  type: z.enum(AUDIENCE_TYPES),
  faculty: z.string().trim().optional(),
  department: z.string().trim().optional(),
  level: z.string().trim().optional(),
  eventId: z.string().trim().optional(),
});

export const announcementCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  summary: z
    .string()
    .trim()
    .min(10, "Summary must be at least 10 characters")
    .max(500, "Summary cannot exceed 500 characters"),
  content: z
    .string()
    .trim()
    .min(20, "Announcement content must be at least 20 characters"),
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default("normal"),
  targetAudience: targetAudienceSchema.default({ type: "all_students" }),
  coverImage: z.string().trim().optional(),
  status: z
    .enum(["draft", "pending_review", "published", "scheduled"])
    .default("draft"),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isPinned: z.boolean().optional().default(false),
  tags: z.array(z.string().trim()).optional().default([]),
});

export type AnnouncementCreateInput = z.input<typeof announcementCreateSchema>;

export const announcementUpdateSchema = announcementCreateSchema.partial();
export type AnnouncementUpdateInput = z.infer<typeof announcementUpdateSchema>;

export const announcementReviewSchema = z
  .object({
    action: z.enum(["approve", "reject", "archive"]),
    rejectionReason: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.action === "reject" && (!data.rejectionReason || data.rejectionReason.length < 5)) {
        return false;
      }
      return true;
    },
    {
      message: "A detailed rejection reason (at least 5 characters) is required when rejecting an announcement.",
      path: ["rejectionReason"],
    }
  );

export type AnnouncementReviewInput = z.infer<typeof announcementReviewSchema>;

export const organizerBroadcastSchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required"),
  updateType: z.enum(["general", "venue_change", "time_change", "cancellation", "instructions"]),
  subjectLine: z
    .string()
    .trim()
    .min(5, "Subject line must be at least 5 characters")
    .max(150, "Subject line cannot exceed 150 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message cannot exceed 2000 characters"),
  newVenue: z.string().trim().optional(),
  newTime: z.string().trim().optional(),
});

export type OrganizerBroadcastInput = z.infer<typeof organizerBroadcastSchema>;

export const announcementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  status: z.string().trim().optional(),
  category: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  search: z.string().trim().optional(),
  authorId: z.string().trim().optional(),
  eventId: z.string().trim().optional(),
});

export type AnnouncementQueryInput = z.infer<typeof announcementQuerySchema>;
