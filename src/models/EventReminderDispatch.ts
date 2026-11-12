import mongoose, { Schema, Document, Model } from "mongoose";

export type ReminderStage = "24h" | "1h" | "custom";

export interface IEventReminderDispatchDocument extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  stage: ReminderStage;
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventStartDate: Date;
  eventVenue: string;
  inAppSent: boolean;
  emailSent: boolean;
  emailDeliveryId?: mongoose.Types.ObjectId;
  emailStatus?: string;
  idempotencyKey: string;
  dispatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventReminderDispatchSchema = new Schema<IEventReminderDispatchDocument>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    stage: {
      type: String,
      enum: ["24h", "1h", "custom"],
      required: true,
      index: true,
    },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    recipientName: { type: String, required: true, trim: true },
    eventTitle: { type: String, required: true, trim: true },
    eventStartDate: { type: Date, required: true },
    eventVenue: { type: String, required: true, trim: true },
    inAppSent: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
    emailDeliveryId: { type: Schema.Types.ObjectId, ref: "EmailDelivery" },
    emailStatus: { type: String, trim: true },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    dispatchedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Compound indexes to optimize reminder lookups and prevent race-condition duplicates
EventReminderDispatchSchema.index({ eventId: 1, stage: 1 });
EventReminderDispatchSchema.index({ userId: 1, eventId: 1, stage: 1 }, { unique: true });

export const EventReminderDispatch: Model<IEventReminderDispatchDocument> =
  mongoose.models.EventReminderDispatch ||
  mongoose.model<IEventReminderDispatchDocument>(
    "EventReminderDispatch",
    EventReminderDispatchSchema
  );
