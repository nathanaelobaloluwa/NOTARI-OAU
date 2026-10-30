import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITicketDocument extends Document {
  bookingId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ticketTierId: mongoose.Types.ObjectId;
  tierName: string;
  ticketCode: string;
  qrCodeUrl?: string;
  attendeeName: string;
  attendeeEmail: string;
  pricePaid: number;
  isCheckedIn: boolean;
  checkedInAt?: Date;
  checkedInBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicketDocument>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ticketTierId: { type: Schema.Types.ObjectId, required: true },
    tierName: { type: String, required: true },
    ticketCode: { type: String, required: true, unique: true, index: true },
    qrCodeUrl: { type: String },
    attendeeName: { type: String, required: true },
    attendeeEmail: { type: String, required: true, lowercase: true },
    pricePaid: { type: Number, required: true, min: 0 },
    isCheckedIn: { type: Boolean, default: false, index: true },
    checkedInAt: { type: Date },
    checkedInBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export const Ticket: Model<ITicketDocument> =
  mongoose.models.Ticket || mongoose.model<ITicketDocument>("Ticket", TicketSchema);
