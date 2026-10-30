import mongoose, { Schema, Document, Model } from "mongoose";
import { EVENT_CATEGORIES, EVENT_STATUS, EventCategory, EventStatus } from "@/constants/oau";

export interface ITicketTierSubdocument {
  name: string;
  price: number;
  capacity: number;
  available: number;
  description?: string;
  maxPerOrder: number;
}

export interface IEventDocument extends Document {
  title: string;
  slug: string;
  description: string;
  organizerId: mongoose.Types.ObjectId;
  organizerName: string;
  category: EventCategory;
  faculty?: string;
  venue: string;
  address?: string;
  startDate: Date;
  endDate: Date;
  flyerUrl?: string;
  galleryUrls?: string[];
  isFree: boolean;
  ticketTiers: ITicketTierSubdocument[];
  totalCapacity: number;
  registeredCount: number;
  status: EventStatus;
  isFeatured: boolean;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TicketTierSchema = new Schema<ITicketTierSubdocument>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1 },
    available: { type: Number, required: true, min: 0 },
    description: { type: String },
    maxPerOrder: { type: Number, default: 5 },
  },
  { _id: true }
);

const EventSchema = new Schema<IEventDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true },
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizerName: { type: String, required: true },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      required: true,
      index: true,
    },
    faculty: { type: String, index: true },
    venue: { type: String, required: true },
    address: { type: String },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    flyerUrl: { type: String },
    galleryUrls: [{ type: String }],
    isFree: { type: Boolean, default: true },
    ticketTiers: [TicketTierSchema],
    totalCapacity: { type: Number, default: 0 },
    registeredCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    rejectionReason: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Event: Model<IEventDocument> =
  mongoose.models.Event || mongoose.model<IEventDocument>("Event", EventSchema);
