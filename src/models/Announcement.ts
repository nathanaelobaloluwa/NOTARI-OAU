import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncementDocument extends Document {
  title: string;
  content: string;
  publishedBy: mongoose.Types.ObjectId;
  targetRole?: string; // "all" | "student" | "organizer"
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncementDocument>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetRole: { type: String, default: "all" },
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const Announcement: Model<IAnnouncementDocument> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncementDocument>("Announcement", AnnouncementSchema);
