import mongoose, { Schema, Document, Model } from "mongoose";
import { ORGANIZER_STATUS, OrganizerStatus } from "@/constants/roles";
import { APPLICANT_TYPES, ApplicantType } from "@/constants/organizer";

export interface IOrganizerProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  organizerType: ApplicantType;
  organizationName: string;
  displayName: string;
  category: string;
  description: string;
  logo?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  faculty?: string;
  department?: string;
  status: OrganizerStatus;
  approvalNotes?: string;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizerProfileSchema = new Schema<IOrganizerProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    organizerType: {
      type: String,
      enum: Object.values(APPLICANT_TYPES),
      default: APPLICANT_TYPES.ORGANIZATION,
      required: true,
      index: true,
    },
    organizationName: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    logo: { type: String },
    website: { type: String, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true },
    department: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(ORGANIZER_STATUS),
      default: ORGANIZER_STATUS.PENDING,
      index: true,
    },
    approvalNotes: { type: String },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    socialLinks: {
      website: { type: String, trim: true },
      twitter: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

// Fallback pre-save hook to ensure displayName is always populated from organizationName if omitted
OrganizerProfileSchema.pre("save", function (next) {
  if (!this.displayName) {
    this.displayName = this.organizationName;
  }
  next();
});

export const OrganizerProfile: Model<IOrganizerProfileDocument> =
  mongoose.models.OrganizerProfile ||
  mongoose.model<IOrganizerProfileDocument>("OrganizerProfile", OrganizerProfileSchema);
