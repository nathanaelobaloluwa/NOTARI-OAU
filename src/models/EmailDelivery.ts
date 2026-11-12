import mongoose, { Schema, Document, Model } from "mongoose";

export type EmailDeliveryStatus =
  | "pending"
  | "accepted"
  | "sent"
  | "delivered"
  | "failed"
  | "simulated"
  | "retry_scheduled"
  | "bounced";
export type EmailProviderType = "resend" | "simulated" | "mock";
export type EmailRelatedType =
  | "booking"
  | "payment"
  | "event"
  | "application"
  | "payout"
  | "refund"
  | "system";

export interface IEmailWebhookEvent {
  eventId: string;
  type: string;
  timestamp: Date;
  raw?: Record<string, unknown>;
}

export interface IEmailDeliveryDocument extends Document {
  recipient: string;
  userId?: mongoose.Types.ObjectId;
  subject: string;
  template: string;
  status: EmailDeliveryStatus;
  provider: EmailProviderType;
  providerMessageId?: string;
  idempotencyKey?: string;
  relatedType?: EmailRelatedType;
  relatedId?: string;
  error?: string;
  retryCount: number;
  lastAttemptAt: Date;
  nextRetryAt?: Date;
  isNonRetryable: boolean;
  deliveredAt?: Date;
  webhookEvents?: IEmailWebhookEvent[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const EmailDeliverySchema = new Schema<IEmailDeliveryDocument>(
  {
    recipient: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    template: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "sent",
        "delivered",
        "failed",
        "simulated",
        "retry_scheduled",
        "bounced",
      ],
      default: "pending",
      index: true,
    },
    provider: {
      type: String,
      enum: ["resend", "simulated", "mock"],
      default: "simulated",
    },
    providerMessageId: {
      type: String,
      trim: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    relatedType: {
      type: String,
      enum: ["booking", "payment", "event", "application", "payout", "refund", "system"],
      index: true,
    },
    relatedId: {
      type: String,
      trim: true,
      index: true,
    },
    error: {
      type: String,
      trim: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    nextRetryAt: {
      type: Date,
      index: true,
    },
    isNonRetryable: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    webhookEvents: [
      {
        eventId: { type: String, required: true },
        type: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        raw: { type: Schema.Types.Mixed },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

EmailDeliverySchema.index({ recipient: 1, relatedType: 1, relatedId: 1, template: 1 });
EmailDeliverySchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
EmailDeliverySchema.index({ status: 1, createdAt: -1 });
EmailDeliverySchema.index({ status: 1, nextRetryAt: 1, isNonRetryable: 1 });

export const EmailDelivery: Model<IEmailDeliveryDocument> =
  mongoose.models.EmailDelivery ||
  mongoose.model<IEmailDeliveryDocument>("EmailDelivery", EmailDeliverySchema);
