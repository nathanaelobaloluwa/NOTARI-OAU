import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { EVENT_STATUS } from "@/constants/oau";
import { notificationService } from "@/services/notification.service";

/**
 * POST /api/organizer/events/[id]/submit
 * Submit a draft or rejected event for Superadmin review
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userWithProfile = await requireApprovedOrganizer(true);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid event ID format." }, { status: 400 });
    }

    await connectToDatabase();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Ownership check
    if (userWithProfile.role !== "admin" && event.organizerId.toString() !== userWithProfile.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You cannot submit events owned by another organizer." },
        { status: 403 }
      );
    }

    if (event.status === EVENT_STATUS.PUBLISHED) {
      return NextResponse.json(
        { success: false, message: "This event is already published." },
        { status: 400 }
      );
    }

    if (event.status === EVENT_STATUS.PENDING_APPROVAL) {
      return NextResponse.json(
        { success: false, message: "This event is already pending review by Superadmin." },
        { status: 400 }
      );
    }

    // Validate readiness for review
    if (!event.title || !event.description || !event.venue || !event.startDate || !event.endDate) {
      return NextResponse.json(
        { success: false, message: "Cannot submit: Please ensure all required event details are completed." },
        { status: 400 }
      );
    }

    if (!event.ticketTiers || event.ticketTiers.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cannot submit: Event must have at least one ticket tier configured." },
        { status: 400 }
      );
    }

    event.status = EVENT_STATUS.PENDING_APPROVAL;
    event.submittedAt = new Date();
    event.rejectionReason = undefined;

    await event.save();

    // Notify organizer of event submission
    try {
      await notificationService.notifyEventSubmitted({
        organizerId: event.organizerId,
        organizerEmail: userWithProfile.email,
        organizerName: userWithProfile.name || "Organizer",
        eventTitle: event.title,
        eventId: event._id.toString(),
      });
    } catch (notifErr) {
      console.error("⚠️ Failed to notify organizer of event submission:", notifErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Event submitted successfully! Superadmins have been notified for review.",
        event,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    if (err.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }
    console.error("❌ Error submitting event for approval:", error);
    return NextResponse.json({ success: false, message: "Failed to submit event for approval." }, { status: 500 });
  }
}

