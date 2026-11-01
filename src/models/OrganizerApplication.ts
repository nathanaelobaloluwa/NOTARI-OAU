import mongoose, { Schema, Document, Model } from "mongoose";
import {
  APPLICANT_TYPES,
  ApplicantType,
  APPLICATION_STATUS,
  ApplicationStatus,
} from "@/constants/organizer";

export interface IApplicationHistoryEntry {
  action: "submitted" | "changes_requested" | "resubmitted" | "approved" | "rejected";
  actorId?: mongoose.Types.ObjectId;
  actorRole?: string;
  notes?: string;
  timestamp: Date;
}

export interface IOrganizerApplicationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  applicantType: ApplicantType;
  status: ApplicationStatus;

  // Individual Applicant Details
  applicantName?: string;
  applicantEmail?: string;
  applicantMatricNumber?: string;
  faculty?: string;
  department?: string;
  phone?: string;
  displayName?: string;
  description?: string;
  reason?: string;
  experience?: string;
  supportingLinks?: string;

  // Campus Organization Details
  organizationName?: string;
  organizationCategory?: string;
  organizationDescription?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonMatric?: string;
  contactPersonPhone?: string;
  officialEmail?: string;

  // Review & Admin Fields
  reviewerId?: mongoose.Types.ObjectId;
  reviewerName?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  changesRequestedReason?: string;
  reviewNotes?: string;

  // Submission counter & audit history
  submissionCount: number;
  history: IApplicationHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

const ApplicationHistorySchema = new Schema<IApplicationHistoryEntry>(
  {
    action: {
      type: String,
      enum: ["submitted", "changes_requested", "resubmitted", "approved", "rejected"],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String },
    notes: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrganizerApplicationSchema = new Schema<IOrganizerApplicationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applicantType: {
      type: String,
      enum: Object.values(APPLICANT_TYPES),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
      required: true,
      index: true,
    },

    // Individual Applicant Details
    applicantName: { type: String, trim: true },
    applicantEmail: { type: String, lowercase: true, trim: true },
    applicantMatricNumber: { type: String, uppercase: true, trim: true },
    faculty: { type: String, trim: true },
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    displayName: { type: String, trim: true },
    description: { type: String, trim: true },
    reason: { type: String, trim: true },
    experience: { type: String, trim: true },
    supportingLinks: { type: String, trim: true },

    // Campus Organization Details
    organizationName: { type: String, trim: true },
    organizationCategory: { type: String, trim: true },
    organizationDescription: { type: String, trim: true },
    contactPersonName: { type: String, trim: true },
    contactPersonEmail: { type: String, lowercase: true, trim: true },
    contactPersonMatric: { type: String, uppercase: true, trim: true },
    contactPersonPhone: { type: String, trim: true },
    officialEmail: { type: String, lowercase: true, trim: true },

    // Superadmin Review Details
    reviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    reviewerName: { type: String, trim: true },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    changesRequestedReason: { type: String, trim: true },
    reviewNotes: { type: String, trim: true },

    // Audit and counter
    submissionCount: { type: Number, default: 1, min: 1 },
    history: { type: [ApplicationHistorySchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Helpful index to query user's latest applications or list by status
OrganizerApplicationSchema.index({ userId: 1, createdAt: -1 });
OrganizerApplicationSchema.index({ status: 1, createdAt: -1 });

export const OrganizerApplication: Model<IOrganizerApplicationDocument> =
  mongoose.models.OrganizerApplication ||
  mongoose.model<IOrganizerApplicationDocument>("OrganizerApplication", OrganizerApplicationSchema);

