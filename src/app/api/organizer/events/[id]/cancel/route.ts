import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { EVENT_STATUS } from "@/constants/oau";

/**
 * POST /api/organizer/events/[id]/cancel
 * Cancel an upcoming published or pending event
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprovedOrganizer(true);
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
    if (user.role !== "admin" && event.organizerId.toString() !== user.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You cannot cancel events owned by another organizer." },
        { status: 403 }
      );
    }

    if (event.status === EVENT_STATUS.CANCELLED) {
      return NextResponse.json(
        { success: false, message: "Event is already cancelled." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    event.status = EVENT_STATUS.CANCELLED;
    if (reason) {
      event.rejectionReason = `Cancelled by organizer: ${reason}`;
    }

    await event.save();

    return NextResponse.json(
      {
        success: true,
        message: "Event has been cancelled successfully.",
        event,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    console.error("❌ Error cancelling event:", error);
    return NextResponse.json({ success: false, message: "Failed to cancel event." }, { status: 500 });
  }
}

