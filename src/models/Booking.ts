import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBookingDocument extends Document {
  bookingReference: string;
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  ticketTierId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: "pending" | "successful" | "failed" | "refunded";
  paymentReference?: string;
  paymentChannel: "paystack" | "free";
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBookingDocument>(
  {
    bookingReference: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    ticketTierId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "successful", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paymentReference: { type: String, index: true, sparse: true, unique: true },
    paymentChannel: { type: String, enum: ["paystack", "free"], default: "free" },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Booking: Model<IBookingDocument> =
  mongoose.models.Booking || mongoose.model<IBookingDocument>("Booking", BookingSchema);
