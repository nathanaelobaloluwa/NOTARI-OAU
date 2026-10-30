import { UserRole } from "@/constants/roles";

export interface IUser {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizerProfile {
  _id: string;
  userId: string;
  organizationName: string;
  category: string;
  description: string;
  logo?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}
