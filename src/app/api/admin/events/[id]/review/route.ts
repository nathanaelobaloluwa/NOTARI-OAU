import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { adminEventReviewSchema } from "@/validators/event";
import { EVENT_STATUS } from "@/constants/oau";
import { notificationService } from "@/services/notification.service";

/**
 * POST /api/admin/events/[id]/review
 * Superadmin decision: Approve (publish) or Reject with required reason
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid event ID format." }, { status: 400 });
    }

    const body = await req.json();
    const validation = adminEventReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;

    await connectToDatabase();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    if (action === "approve") {
      event.status = EVENT_STATUS.PUBLISHED;
      event.approvedAt = new Date();
      event.approvedBy = new mongoose.Types.ObjectId(admin.id);
      event.rejectionReason = undefined;

      await event.save();

      // Notify organizer of event publication
      try {
        const organizer = await User.findById(event.organizerId).select("name email").lean();
        if (organizer?.email) {
          await notificationService.notifyEventApproved({
            organizerId: event.organizerId,
            organizerEmail: organizer.email,
            organizerName: organizer.name || "Organizer",
            eventTitle: event.title,
            eventId: event._id.toString(),
            eventSlug: event.slug,
            reviewerName: admin.name || "Superadmin",
          });
        }
      } catch (notifErr) {
        console.error("⚠️ Failed to notify organizer of event approval:", notifErr);
      }

      return NextResponse.json(
        {
          success: true,
          message: `Event "${event.title}" has been approved and is now published to the OAU event feed.`,
          event,
        },
        { status: 200 }
      );
    }

    if (action === "reject") {
      event.status = EVENT_STATUS.REJECTED;
      event.rejectionReason = reason;

      await event.save();

      // Notify organizer of event revision feedback
      try {
        const organizer = await User.findById(event.organizerId).select("name email").lean();
        if (organizer?.email) {
          await notificationService.notifyEventRejected({
            organizerId: event.organizerId,
            organizerEmail: organizer.email,
            organizerName: organizer.name || "Organizer",
            eventTitle: event.title,
            eventId: event._id.toString(),
            reason: reason || "Please review event details and guidelines.",
            reviewerName: admin.name || "Superadmin",
          });
        }
      } catch (notifErr) {
        console.error("⚠️ Failed to notify organizer of event rejection:", notifErr);
      }

      return NextResponse.json(
        {
          success: true,
          message: `Event submission has been rejected. Organizer feedback recorded.`,
          event,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: false, message: "Invalid review action." }, { status: 400 });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    if (err.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }
    console.error("❌ Error reviewing event submission:", error);
    return NextResponse.json({ success: false, message: "Failed to process event review." }, { status: 500 });
  }
}

