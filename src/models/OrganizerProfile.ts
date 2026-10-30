import mongoose, { Schema, Document, Model } from "mongoose";
import { ORGANIZER_STATUS, OrganizerStatus } from "@/constants/roles";

export interface IOrganizerProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  organizationName: string;
  category: string;
  description: string;
  logo?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  status: OrganizerStatus;
  approvalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizerProfileSchema = new Schema<IOrganizerProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    organizationName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    logo: { type: String },
    website: { type: String },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ORGANIZER_STATUS),
      default: ORGANIZER_STATUS.PENDING,
      index: true,
    },
    approvalNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const OrganizerProfile: Model<IOrganizerProfileDocument> =
  mongoose.models.OrganizerProfile ||
  mongoose.model<IOrganizerProfileDocument>("OrganizerProfile", OrganizerProfileSchema);
