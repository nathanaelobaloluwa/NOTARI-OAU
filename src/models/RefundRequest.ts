import mongoose, { Schema, Document, Model } from "mongoose";

export type RefundRequestStatus =
  | "pending"
  | "approved"
  | "processing"
  | "successful"
  | "rejected"
  | "cancelled";

export const REFUND_REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSING: "processing",
  SUCCESSFUL: "successful",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export interface IRefundRequestDocument extends Document {
  refundReference: string;
  bookingId: mongoose.Types.ObjectId;
  paymentId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  amount: number; // in NGN
  amountInKobo: number; // integer Kobo
  currency: string;
  reason: string;
  status: RefundRequestStatus;
  paystackRefundId?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  rejectionReason?: string;
  ticketsInvalidated: boolean;
  invalidatedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const RefundRequestSchema = new Schema<IRefundRequestDocument>(
  {
    refundReference: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    amountInKobo: { type: Number, required: true, min: 100 },
    currency: { type: String, default: "NGN", uppercase: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(REFUND_REQUEST_STATUS),
      default: REFUND_REQUEST_STATUS.PENDING,
      index: true,
    },
    paystackRefundId: { type: String, sparse: true, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    ticketsInvalidated: { type: Boolean, default: false },
    invalidatedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
RefundRequestSchema.index({ userId: 1, status: 1 });
RefundRequestSchema.index({ bookingId: 1, status: 1 });
RefundRequestSchema.index({ organizerId: 1, status: 1 });
RefundRequestSchema.index({ status: 1, createdAt: -1 });

export const RefundRequest: Model<IRefundRequestDocument> =
  mongoose.models.RefundRequest ||
  mongoose.model<IRefundRequestDocument>("RefundRequest", RefundRequestSchema);
