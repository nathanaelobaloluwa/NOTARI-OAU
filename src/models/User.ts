import mongoose, { Schema, Document, Model } from "mongoose";
import { USER_ROLES, UserRole } from "@/constants/roles";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  profilePhotoUrl?: string;
  profilePhotoPublicId?: string;
  role: UserRole;
  isOrganizer?: boolean;
  matricNumber?: string;
  faculty?: string;
  department?: string;
  level?: string;
  phone?: string;
  isVerified: boolean;
  status?: "active" | "suspended";
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailPreferences?: {
    eventReminders?: boolean;
    campusAnnouncements?: boolean;
    browserNotifications?: boolean;
  };
  notificationPreferences?: {
    eventReminders?: boolean;
    campusAnnouncements?: boolean;
    browserNotifications?: boolean;
    ticketUpdates?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    image: { type: String },
    profilePhotoUrl: { type: String },
    profilePhotoPublicId: { type: String },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
      required: true,
      index: true,
    },
    isOrganizer: {
      type: Boolean,
      default: false,
      index: true,
    },
    matricNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      unique: true,
      set: (v: string | null | undefined) =>
        v && v.trim().length > 0 ? v.trim().toUpperCase() : undefined,
    },
    faculty: { type: String, trim: true },
    department: { type: String, trim: true },
    level: { type: String, trim: true },
    phone: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailPreferences: {
      eventReminders: { type: Boolean, default: true },
      campusAnnouncements: { type: Boolean, default: true },
      browserNotifications: { type: Boolean, default: true },
    },
    notificationPreferences: {
      eventReminders: { type: Boolean, default: true },
      campusAnnouncements: { type: Boolean, default: true },
      browserNotifications: { type: Boolean, default: true },
      ticketUpdates: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
