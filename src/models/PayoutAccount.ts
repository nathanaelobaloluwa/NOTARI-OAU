import mongoose, { Schema, Document, Model } from "mongoose";

export type PayoutAccountStatus =
  | "pending_verification"
  | "verified"
  | "rejected"
  | "disabled";

export const PAYOUT_ACCOUNT_STATUS = {
  PENDING_VERIFICATION: "pending_verification",
  VERIFIED: "verified",
  REJECTED: "rejected",
  DISABLED: "disabled",
} as const;

export interface IPayoutAccountDocument extends Document {
  organizerId: mongoose.Types.ObjectId;
  organizerProfileId: mongoose.Types.ObjectId;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  accountNumberMasked: string;
  paystackRecipientCode?: string;
  status: PayoutAccountStatus;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  verificationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutAccountSchema = new Schema<IPayoutAccountDocument>(
  {
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizerProfileId: { type: Schema.Types.ObjectId, ref: "OrganizerProfile", required: true, index: true },
    bankName: { type: String, required: true, trim: true },
    bankCode: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumberMasked: { type: String, required: true, trim: true },
    paystackRecipientCode: { type: String, trim: true, sparse: true, index: true },
    status: {
      type: String,
      enum: Object.values(PAYOUT_ACCOUNT_STATUS),
      default: PAYOUT_ACCOUNT_STATUS.PENDING_VERIFICATION,
      index: true,
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    verificationNotes: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Mask helper: masks all digits except the last 4 (e.g. 0123456789 -> ******6789)
export function maskAccountNumber(accNum: string): string {
  const clean = accNum.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return "*".repeat(clean.length - 4) + last4;
}

// Compound indexes
PayoutAccountSchema.index({ organizerId: 1, status: 1 });
PayoutAccountSchema.index({ status: 1, createdAt: -1 });

export const PayoutAccount: Model<IPayoutAccountDocument> =
  mongoose.models.PayoutAccount ||
  mongoose.model<IPayoutAccountDocument>("PayoutAccount", PayoutAccountSchema);
