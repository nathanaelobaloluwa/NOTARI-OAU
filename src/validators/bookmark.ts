import { z } from "zod";

export const bookmarkSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export type BookmarkInput = z.infer<typeof bookmarkSchema>;

export const bookmarkQuerySchema = z.object({
  idsOnly: z
    .enum(["true", "false", ""])
    .optional()
    .transform((v) => v === "true"),
});

export type BookmarkQueryInput = z.infer<typeof bookmarkQuerySchema>;
