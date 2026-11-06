import mongoose, { Schema, Document, Model } from "mongoose";

export type PayoutRequestStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "processing"
  | "successful"
  | "failed"
  | "rejected"
  | "cancelled";

export const PAYOUT_REQUEST_STATUS = {
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  PROCESSING: "processing",
  SUCCESSFUL: "successful",
  FAILED: "failed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export interface IPayoutRequestDocument extends Document {
  payoutReference: string;
  organizerId: mongoose.Types.ObjectId;
  organizerProfileId: mongoose.Types.ObjectId;
  payoutAccountId: mongoose.Types.ObjectId;
  amount: number; // in NGN
  amountInKobo: number; // integer Kobo
  currency: string;
  status: PayoutRequestStatus;
  paystackTransferCode?: string;
  paystackTransferId?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  failureReason?: string;
  paidAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutRequestSchema = new Schema<IPayoutRequestDocument>(
  {
    payoutReference: { type: String, required: true, unique: true, index: true },
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizerProfileId: { type: Schema.Types.ObjectId, ref: "OrganizerProfile", required: true, index: true },
    payoutAccountId: { type: Schema.Types.ObjectId, ref: "PayoutAccount", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    amountInKobo: { type: Number, required: true, min: 100 },
    currency: { type: String, default: "NGN", uppercase: true },
    status: {
      type: String,
      enum: Object.values(PAYOUT_REQUEST_STATUS),
      default: PAYOUT_REQUEST_STATUS.PENDING,
      index: true,
    },
    paystackTransferCode: { type: String, sparse: true, index: true },
    paystackTransferId: { type: String, sparse: true, index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, trim: true },
    failureReason: { type: String, trim: true },
    paidAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PayoutRequestSchema.index({ organizerId: 1, status: 1 });
PayoutRequestSchema.index({ status: 1, createdAt: -1 });
PayoutRequestSchema.index({ payoutAccountId: 1, status: 1 });

export const PayoutRequest: Model<IPayoutRequestDocument> =
  mongoose.models.PayoutRequest ||
  mongoose.model<IPayoutRequestDocument>("PayoutRequest", PayoutRequestSchema);
