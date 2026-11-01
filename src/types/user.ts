import { UserRole } from "@/constants/roles";
import { ApplicantType, ApplicationStatus } from "@/constants/organizer";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: UserRole;
  isOrganizer?: boolean;
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
  organizerType?: ApplicantType;
  organizationName: string;
  displayName?: string;
  category: string;
  description: string;
  logo?: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  faculty?: string;
  department?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  approvalNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizerApplication {
  _id: string;
  userId: string;
  applicantType: ApplicantType;
  status: ApplicationStatus;
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
  organizationName?: string;
  organizationCategory?: string;
  organizationDescription?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonMatric?: string;
  contactPersonPhone?: string;
  officialEmail?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  changesRequestedReason?: string;
  reviewNotes?: string;
  submissionCount: number;
  history?: Array<{
    action: string;
    notes?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
