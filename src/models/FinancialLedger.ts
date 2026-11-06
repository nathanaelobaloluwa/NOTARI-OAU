import mongoose, { Schema, Document, Model } from "mongoose";

export type FinancialLedgerEntryType =
  | "ticket_payment"
  | "platform_fee"
  | "organizer_earning"
  | "refund"
  | "payout_reservation"
  | "completed_payout"
  | "payout_reversal"
  | "adjustment";

export const FINANCIAL_ENTRY_TYPES = {
  TICKET_PAYMENT: "ticket_payment",
  PLATFORM_FEE: "platform_fee",
  ORGANIZER_EARNING: "organizer_earning",
  REFUND: "refund",
  PAYOUT_RESERVATION: "payout_reservation",
  COMPLETED_PAYOUT: "completed_payout",
  PAYOUT_REVERSAL: "payout_reversal",
  ADJUSTMENT: "adjustment",
} as const;

export interface IFinancialLedgerDocument extends Document {
  entryType: FinancialLedgerEntryType;
  direction: "credit" | "debit";
  amount: number; // in NGN
  amountInKobo: number; // integer Kobo
  currency: string;
  organizerId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  payoutRequestId?: mongoose.Types.ObjectId;
  refundRequestId?: mongoose.Types.ObjectId;
  reference: string;
  description: string;
  balanceAfterInKobo?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialLedgerSchema = new Schema<IFinancialLedgerDocument>(
  {
    entryType: {
      type: String,
      enum: Object.values(FINANCIAL_ENTRY_TYPES),
      required: true,
      index: true,
    },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 0 },
    amountInKobo: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", uppercase: true },
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    payoutRequestId: { type: Schema.Types.ObjectId, ref: "PayoutRequest", index: true },
    refundRequestId: { type: Schema.Types.ObjectId, ref: "RefundRequest", index: true },
    reference: { type: String, required: true, index: true },
    description: { type: String, required: true, trim: true },
    balanceAfterInKobo: { type: Number },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant ledger aggregations and statement queries
FinancialLedgerSchema.index({ organizerId: 1, createdAt: -1 });
FinancialLedgerSchema.index({ reference: 1, entryType: 1 });
FinancialLedgerSchema.index({ eventId: 1, entryType: 1 });
FinancialLedgerSchema.index({ createdAt: -1 });

export const FinancialLedger: Model<IFinancialLedgerDocument> =
  mongoose.models.FinancialLedger ||
  mongoose.model<IFinancialLedgerDocument>("FinancialLedger", FinancialLedgerSchema);
