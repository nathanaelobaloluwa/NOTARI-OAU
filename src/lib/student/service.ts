import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User, Booking, Ticket } from "@/models";
import { USER_ROLES } from "@/constants/roles";
import { normalizeFaculty } from "@/constants/oau";
import {
  StudentProfileUpdateInput,
  ChangePasswordInput,
} from "@/validators/student";

export interface StudentServiceResult {
  success: boolean;
  status: number;
  message: string;
  data?: unknown;
}

export interface SanitizedStudentProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  profilePhotoUrl?: string;
  matricNumber?: string;
  faculty?: string;
  department?: string;
  level?: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  emailPreferences?: {
    eventReminders: boolean;
    campusAnnouncements: boolean;
    browserNotifications?: boolean;
  };
  createdAt: string;
}

export interface StudentHistoryItem {
  id: string; // Booking ID
  bookingReference: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: "pending" | "successful" | "failed" | "refunded";
  paymentChannel: "paystack" | "free";
  bookedAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    venue: string;
    startDate: string;
    endDate: string;
    flyerUrl?: string;
    category: string;
    organizerName: string;
  } | null;
  tickets: Array<{
    id: string;
    ticketCode: string;
    tierName: string;
    isCheckedIn: boolean;
    checkedInAt?: string;
  }>;
  isPast: boolean;
  isUpcoming: boolean;
  isAttended: boolean;
  attendanceStatus: "upcoming" | "attended" | "not_attended" | "refunded";
}

export interface HistoryCounts {
  all: number;
  upcoming: number;
  attended: number;
  past: number;
}

/**
 * Retrieve the current authenticated student's profile
 */
export async function getStudentProfile(userId: string): Promise<StudentServiceResult> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, status: 400, message: "Invalid student identifier" };
  }

  await connectToDatabase();

  const student = await User.findById(userId).select("-password").lean();
  if (!student) {
    return { success: false, status: 404, message: "Student account not found" };
  }

  if (student.role !== USER_ROLES.STUDENT) {
    return { success: false, status: 403, message: "Access restricted to student accounts" };
  }

  const profile: SanitizedStudentProfile = {
    id: student._id.toString(),
    name: student.name,
    email: student.email,
    image:
      (student as { image?: string }).image && !(student as { image?: string }).image?.startsWith("data:")
        ? (student as { image?: string }).image
        : (student as { profilePhotoUrl?: string }).profilePhotoUrl
        ? `/api/user/profile-photo?userId=${student._id.toString()}`
        : undefined,
    profilePhotoUrl:
      (student as { profilePhotoUrl?: string }).profilePhotoUrl?.startsWith("data:")
        ? `/api/user/profile-photo?userId=${student._id.toString()}`
        : (student as { profilePhotoUrl?: string }).profilePhotoUrl,
    matricNumber: student.matricNumber,
    faculty: student.faculty || "",
    department: student.department || "",
    level: student.level || "",
    phone: student.phone || "",
    role: student.role,
    isVerified: Boolean(student.isVerified),
    emailPreferences: {
      eventReminders: student.emailPreferences?.eventReminders ?? true,
      campusAnnouncements: student.emailPreferences?.campusAnnouncements ?? true,
      browserNotifications: student.emailPreferences?.browserNotifications ?? true,
    },
    createdAt: student.createdAt ? new Date(student.createdAt).toISOString() : new Date().toISOString(),
  };

  return {
    success: true,
    status: 200,
    message: "Student profile retrieved successfully",
    data: profile,
  };
}

/**
 * Update authenticated student's profile (only permitted fields)
 */
export async function updateStudentProfile(
  userId: string,
  data: StudentProfileUpdateInput
): Promise<StudentServiceResult> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, status: 400, message: "Invalid student identifier" };
  }

  await connectToDatabase();

  const student = await User.findById(userId);
  if (!student) {
    return { success: false, status: 404, message: "Student account not found" };
  }

  if (student.role !== USER_ROLES.STUDENT) {
    return { success: false, status: 403, message: "Access restricted to student accounts" };
  }

  // Update only supported profile fields (prevent tampering with role, matric, email, isVerified)
  student.name = data.name.trim();
  if (data.phone !== undefined) {
    student.phone = data.phone.trim();
  }
  if (data.faculty !== undefined) {
    student.faculty = normalizeFaculty(data.faculty) || data.faculty.trim();
  }
  if (data.department !== undefined) {
    student.department = data.department.trim();
  }
  if (data.level !== undefined) {
    student.level = data.level.trim();
  }
  if (data.emailPreferences !== undefined) {
    student.emailPreferences = {
      eventReminders:
        data.emailPreferences.eventReminders !== undefined
          ? data.emailPreferences.eventReminders
          : (student.emailPreferences?.eventReminders ?? true),
      campusAnnouncements:
        data.emailPreferences.campusAnnouncements !== undefined
          ? data.emailPreferences.campusAnnouncements
          : (student.emailPreferences?.campusAnnouncements ?? true),
      browserNotifications:
        data.emailPreferences.browserNotifications !== undefined
          ? data.emailPreferences.browserNotifications
          : (student.emailPreferences?.browserNotifications ?? true),
    };
  }

  await student.save();

  const updatedProfile: SanitizedStudentProfile = {
    id: student._id.toString(),
    name: student.name,
    email: student.email,
    image:
      student.image && !student.image.startsWith("data:")
        ? student.image
        : student.profilePhotoUrl
        ? `/api/user/profile-photo?userId=${student._id.toString()}`
        : undefined,
    profilePhotoUrl:
      student.profilePhotoUrl && student.profilePhotoUrl.startsWith("data:")
        ? `/api/user/profile-photo?userId=${student._id.toString()}`
        : student.profilePhotoUrl,
    matricNumber: student.matricNumber,
    faculty: student.faculty || "",
    department: student.department || "",
    level: student.level || "",
    phone: student.phone || "",
    role: student.role,
    isVerified: Boolean(student.isVerified),
    emailPreferences: {
      eventReminders: student.emailPreferences?.eventReminders ?? true,
      campusAnnouncements: student.emailPreferences?.campusAnnouncements ?? true,
      browserNotifications: student.emailPreferences?.browserNotifications ?? true,
    },
    createdAt: student.createdAt ? new Date(student.createdAt).toISOString() : new Date().toISOString(),
  };

  return {
    success: true,
    status: 200,
    message: "Profile updated successfully",
    data: updatedProfile,
  };
}

/**
 * Change student's password
 */
export async function changeStudentPassword(
  userId: string,
  data: ChangePasswordInput
): Promise<StudentServiceResult> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, status: 400, message: "Invalid student identifier" };
  }

  await connectToDatabase();

  // Explicitly select password
  const student = await User.findById(userId).select("+password");
  if (!student) {
    return { success: false, status: 404, message: "Student account not found" };
  }

  if (student.role !== USER_ROLES.STUDENT) {
    return { success: false, status: 403, message: "Access restricted to student accounts" };
  }

  if (!student.password) {
    return {
      success: false,
      status: 400,
      message: "Password change is not available for this account type",
    };
  }

  // Verify current password
  const isMatch = await bcrypt.compare(data.currentPassword, student.password);
  if (!isMatch) {
    return {
      success: false,
      status: 400,
      message: "The current password you provided is incorrect",
    };
  }

  // Hash new password securely
  const newHash = await bcrypt.hash(data.newPassword, 12);
  student.password = newHash;
  await student.save();

  return {
    success: true,
    status: 200,
    message: "Your password has been changed successfully",
  };
}

interface PopulatedEventForHistory {
  _id: { toString(): string };
  title: string;
  slug: string;
  venue: string;
  startDate?: Date;
  endDate?: Date;
  flyerUrl?: string;
  category: string;
  organizerName: string;
}

/**
 * Retrieve booking and attendance history for authenticated student
 */
export async function getStudentHistory(
  userId: string,
  filterTab: string = "all"
): Promise<StudentServiceResult> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { success: false, status: 400, message: "Invalid student identifier" };
  }

  await connectToDatabase();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // 1. Fetch bookings
  const bookings = await Booking.find({ userId: userObjectId })
    .populate({
      path: "eventId",
      select: "title slug venue startDate endDate flyerUrl category organizerName status",
    })
    .sort({ createdAt: -1 })
    .lean();

  if (bookings.length === 0) {
    return {
      success: true,
      status: 200,
      message: "History retrieved successfully",
      data: {
        items: [],
        counts: { all: 0, upcoming: 0, attended: 0, past: 0 },
      },
    };
  }

  // 2. Fetch all tickets for these bookings
  const bookingIds = bookings.map((b) => b._id);
  const tickets = await Ticket.find({ bookingId: { $in: bookingIds } })
    .select("bookingId ticketCode tierName isCheckedIn checkedInAt")
    .lean();

  const ticketsByBooking = new Map<string, typeof tickets>();
  for (const t of tickets) {
    const bId = t.bookingId.toString();
    const list = ticketsByBooking.get(bId) || [];
    list.push(t);
    ticketsByBooking.set(bId, list);
  }

  const now = new Date();

  // 3. Transform bookings into history items with genuine attendance
  const allItems: StudentHistoryItem[] = bookings.map((b) => {
    const evt = b.eventId as unknown as PopulatedEventForHistory | null;
    const bTickets = ticketsByBooking.get(b._id.toString()) || [];

    const eventEndDate = evt?.endDate
      ? new Date(evt.endDate)
      : evt?.startDate
      ? new Date(evt.startDate)
      : new Date(0);

    const isPast = eventEndDate < now;
    const isUpcoming = !isPast;
    const hasAttended = bTickets.some((t) => Boolean(t.isCheckedIn));

    let attendanceStatus: "upcoming" | "attended" | "not_attended" | "refunded" = "upcoming";
    if (b.paymentStatus === "refunded") {
      attendanceStatus = "refunded";
    } else if (hasAttended) {
      attendanceStatus = "attended";
    } else if (isPast) {
      attendanceStatus = "not_attended";
    } else {
      attendanceStatus = "upcoming";
    }

    return {
      id: b._id.toString(),
      bookingReference: b.bookingReference,
      quantity: b.quantity,
      unitPrice: b.unitPrice,
      totalAmount: b.totalAmount,
      paymentStatus: b.paymentStatus,
      paymentChannel: b.paymentChannel,
      bookedAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
      event: evt && evt.title
        ? {
            id: evt._id.toString(),
            title: evt.title,
            slug: evt.slug,
            venue: evt.venue,
            startDate: evt.startDate ? new Date(evt.startDate).toISOString() : "",
            endDate: evt.endDate ? new Date(evt.endDate).toISOString() : "",
            flyerUrl: evt.flyerUrl,
            category: evt.category,
            organizerName: evt.organizerName,
          }
        : null,
      tickets: bTickets.map((t) => ({
        id: t._id.toString(),
        ticketCode: t.ticketCode,
        tierName: t.tierName,
        isCheckedIn: Boolean(t.isCheckedIn),
        checkedInAt: t.checkedInAt ? new Date(t.checkedInAt).toISOString() : undefined,
      })),
      isPast,
      isUpcoming,
      isAttended: hasAttended,
      attendanceStatus,
    };
  });

  // Calculate counts across all categories
  const counts: HistoryCounts = {
    all: allItems.length,
    upcoming: allItems.filter((item) => item.isUpcoming).length,
    attended: allItems.filter((item) => item.isAttended).length,
    past: allItems.filter((item) => item.isPast).length,
  };

  // Filter based on requested tab
  let filteredItems = allItems;
  if (filterTab === "upcoming") {
    filteredItems = allItems.filter((item) => item.isUpcoming);
  } else if (filterTab === "attended") {
    filteredItems = allItems.filter((item) => item.isAttended);
  } else if (filterTab === "past") {
    filteredItems = allItems.filter((item) => item.isPast);
  }

  return {
    success: true,
    status: 200,
    message: "History retrieved successfully",
    data: {
      items: filteredItems,
      counts,
    },
  };
}
