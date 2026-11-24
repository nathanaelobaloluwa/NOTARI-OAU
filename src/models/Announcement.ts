import mongoose, { Schema, Document, Model } from "mongoose";

export const ANNOUNCEMENT_CATEGORIES = [
  "general_news",
  "academic_updates",
  "student_affairs",
  "faculty_announcements",
  "departmental_updates",
  "campus_events",
  "emergency_notices",
  "opportunities",
  "scholarships_competitions",
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "scheduled",
  "published",
  "archived",
  "rejected",
] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const AUDIENCE_TYPES = [
  "all_students",
  "faculty",
  "department",
  "academic_level",
  "event_attendees",
  "custom_group",
] as const;
export type AudienceType = (typeof AUDIENCE_TYPES)[number];

export interface ITargetAudience {
  type: AudienceType;
  faculty?: string;
  department?: string;
  level?: string; // e.g. "100", "200", "300", "400", "500", "postgraduate"
  eventId?: mongoose.Types.ObjectId;
}

export interface INotificationStats {
  inAppSentCount: number;
  emailsQueuedCount: number;
  emailsDeliveredCount: number;
  emailsFailedCount: number;
}

export interface IAnnouncementDocument extends Document {
  title: string;
  summary: string;
  content: string;
  category: AnnouncementCategory;
  coverImage?: string;
  priority: AnnouncementPriority;
  targetAudience: ITargetAudience;
  status: AnnouncementStatus;
  scheduledFor?: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  authorId: mongoose.Types.ObjectId;
  authorRole: "admin" | "organizer";
  authorName?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  isPinned: boolean;
  readBy: mongoose.Types.ObjectId[];
  notificationStats: INotificationStats;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TargetAudienceSchema = new Schema<ITargetAudience>(
  {
    type: {
      type: String,
      enum: AUDIENCE_TYPES,
      default: "all_students",
      required: true,
    },
    faculty: { type: String, trim: true },
    department: { type: String, trim: true },
    level: { type: String, trim: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
  },
  { _id: false }
);

const NotificationStatsSchema = new Schema<INotificationStats>(
  {
    inAppSentCount: { type: Number, default: 0, min: 0 },
    emailsQueuedCount: { type: Number, default: 0, min: 0 },
    emailsDeliveredCount: { type: Number, default: 0, min: 0 },
    emailsFailedCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const AnnouncementSchema = new Schema<IAnnouncementDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ANNOUNCEMENT_CATEGORIES,
      default: "general_news",
      required: true,
      index: true,
    },
    coverImage: { type: String, trim: true },
    priority: {
      type: String,
      enum: ANNOUNCEMENT_PRIORITIES,
      default: "normal",
      required: true,
      index: true,
    },
    targetAudience: {
      type: TargetAudienceSchema,
      required: true,
      default: () => ({ type: "all_students" }),
    },
    status: {
      type: String,
      enum: ANNOUNCEMENT_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    scheduledFor: { type: Date, index: true },
    publishedAt: { type: Date, index: true },
    expiresAt: { type: Date, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorRole: {
      type: String,
      enum: ["admin", "organizer"],
      default: "admin",
      required: true,
    },
    authorName: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    isPinned: { type: Boolean, default: false, index: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    notificationStats: {
      type: NotificationStatsSchema,
      default: () => ({
        inAppSentCount: 0,
        emailsQueuedCount: 0,
        emailsDeliveredCount: 0,
        emailsFailedCount: 0,
      }),
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance querying and filtering
AnnouncementSchema.index({ status: 1, isPinned: -1, publishedAt: -1 });
AnnouncementSchema.index({ "targetAudience.type": 1, status: 1 });
AnnouncementSchema.index({ "targetAudience.eventId": 1, status: 1 });
AnnouncementSchema.index({ scheduledFor: 1, status: 1 });
AnnouncementSchema.index({ status: 1, "targetAudience.type": 1, "targetAudience.faculty": 1 });
AnnouncementSchema.index({ status: 1, "targetAudience.type": 1, "targetAudience.department": 1 });
AnnouncementSchema.index({ status: 1, "targetAudience.type": 1, "targetAudience.level": 1 });
AnnouncementSchema.index({ status: 1, expiresAt: 1, isPinned: -1, publishedAt: -1 });

export const Announcement: Model<IAnnouncementDocument> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncementDocument>("Announcement", AnnouncementSchema);
