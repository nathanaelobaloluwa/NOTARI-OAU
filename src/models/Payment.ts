import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "abandoned"
  | "refunded"
  | "reconciliation_needed";

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCESSFUL: "successful",
  FAILED: "failed",
  ABANDONED: "abandoned",
  REFUNDED: "refunded",
  RECONCILIATION_NEEDED: "reconciliation_needed",
} as const;

export interface IPaymentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  ticketTierId: mongoose.Types.ObjectId;
  tierName: string;
  quantity: number;
  unitPrice: number;
  amount: number; // in NGN
  amountInKobo: number; // in Kobo
  currency: string;
  paymentReference: string;
  paystackTransactionId?: string;
  paymentStatus: PaymentStatus;
  paymentChannel: string;
  paidAt?: Date;
  reservedUntil: Date;
  customerEmail: string;
  customerName: string;
  verifiedAt?: Date;
  verifiedBy?: "webhook" | "callback" | "admin";
  gatewayResponse?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticketTierId: { type: Schema.Types.ObjectId, required: true },
    tierName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    amountInKobo: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "NGN", uppercase: true },
    paymentReference: { type: String, required: true, unique: true, index: true },
    paystackTransactionId: { type: String, index: true, sparse: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    paymentChannel: { type: String, default: "paystack" },
    paidAt: { type: Date },
    reservedUntil: { type: Date, required: true, index: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    verifiedAt: { type: Date },
    verifiedBy: { type: String, enum: ["webhook", "callback", "admin"] },
    gatewayResponse: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal aggregation and cleanups
PaymentSchema.index({ eventId: 1, paymentStatus: 1 });
PaymentSchema.index({ organizerId: 1, paymentStatus: 1 });
PaymentSchema.index({ paymentStatus: 1, reservedUntil: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment: Model<IPaymentDocument> =
  mongoose.models.Payment || mongoose.model<IPaymentDocument>("Payment", PaymentSchema);

