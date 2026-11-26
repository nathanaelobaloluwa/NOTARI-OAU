import mongoose, { Schema, Document, Model } from "mongoose";

export type OtpPurpose = "registration" | "login" | "password_reset";

export interface IOtpDocument extends Document {
  userId?: mongoose.Types.ObjectId;
  email: string;
  codeHash: string;
  salt: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema = new Schema<IOtpDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    salt: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["registration", "login", "password_reset"],
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "10m" }, // MongoDB TTL auto-cleanup
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active code lookups
OtpSchema.index({ email: 1, purpose: 1, usedAt: 1, expiresAt: 1 });

export const Otp: Model<IOtpDocument> =
  mongoose.models.Otp || mongoose.model<IOtpDocument>("Otp", OtpSchema);
