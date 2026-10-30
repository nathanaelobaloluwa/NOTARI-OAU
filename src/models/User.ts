import mongoose, { Schema, Document, Model } from "mongoose";
import { USER_ROLES, UserRole } from "@/constants/roles";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: UserRole;
  matricNumber?: string;
  faculty?: string;
  department?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    image: { type: String },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
      required: true,
      index: true,
    },
    matricNumber: { type: String, trim: true },
    faculty: { type: String, trim: true },
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
