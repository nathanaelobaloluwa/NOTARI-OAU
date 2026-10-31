import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookmarkDocument extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmarkDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate bookmarks at the database level
BookmarkSchema.index({ userId: 1, eventId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

export const Bookmark: Model<IBookmarkDocument> =
  mongoose.models.Bookmark || mongoose.model<IBookmarkDocument>("Bookmark", BookmarkSchema);
