import mongoose, { Schema, Document, Model } from "mongoose";
import { EVENT_CATEGORIES, EVENT_STATUS, EventCategory, EventStatus } from "@/constants/oau";

export interface ITicketTierSubdocument {
  _id?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  capacity: number;
  available: number;
  description?: string;
  maxPerOrder: number;
  salesStartDate?: Date;
  salesEndDate?: Date;
}

export interface IEventDocument extends Document {
  title: string;
  slug: string;
  summary?: string;
  description: string;
  organizerId: mongoose.Types.ObjectId;
  organizerName: string;
  category: EventCategory;
  eventType?: "physical" | "online" | "hybrid";
  faculty?: string;
  department?: string;
  venue: string;
  address?: string;
  onlineDetails?: {
    platform?: string;
    link?: string;
    accessInfo?: string;
  };
  targetAudience?: string;
  tags?: string[];
  contactEmail?: string;
  contactPhone?: string;
  instructions?: string;
  startDate: Date;
  endDate: Date;
  salesStartDate?: Date;
  salesEndDate?: Date;
  flyerUrl?: string;
  galleryUrls?: string[];
  isFree: boolean;
  ticketTiers: ITicketTierSubdocument[];
  totalCapacity: number;
  registeredCount: number;
  status: EventStatus;
  isFeatured: boolean;
  scheduleVersion: number;
  rejectionReason?: string;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
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
    salesStartDate: { type: Date },
    salesEndDate: { type: Date },
  },
  { _id: true }
);

const EventSchema = new Schema<IEventDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    summary: { type: String, trim: true },
    description: { type: String, required: true },
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizerName: { type: String, required: true },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["physical", "online", "hybrid"],
      default: "physical",
      index: true,
    },
    faculty: { type: String, index: true },
    department: { type: String, trim: true },
    venue: { type: String, required: true },
    address: { type: String, trim: true },
    onlineDetails: {
      platform: { type: String, trim: true },
      link: { type: String, trim: true },
      accessInfo: { type: String, trim: true },
    },
    targetAudience: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    instructions: { type: String, trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    salesStartDate: { type: Date },
    salesEndDate: { type: Date },
    flyerUrl: { type: String, trim: true },
    galleryUrls: [{ type: String, trim: true }],
    isFree: { type: Boolean, default: true, index: true },
    ticketTiers: [TicketTierSchema],
    totalCapacity: { type: Number, default: 0 },
    registeredCount: { type: Number, default: 0 },
    scheduleVersion: { type: Number, default: 1, min: 1, index: true },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    rejectionReason: { type: String, trim: true },
    submittedAt: { type: Date },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

EventSchema.pre("save", function (next) {
  if (this.isModified("startDate") && !this.isNew) {
    this.scheduleVersion = (this.scheduleVersion || 1) + 1;
  }
  next();
});

EventSchema.index({ organizerId: 1, createdAt: -1 });
EventSchema.index({ status: 1, startDate: 1 });

export const Event: Model<IEventDocument> =
  mongoose.models.Event || mongoose.model<IEventDocument>("Event", EventSchema);
