import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { adminEventReviewSchema } from "@/validators/event";
import { EVENT_STATUS } from "@/constants/oau";

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
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    console.error("❌ Error reviewing event submission:", error);
    return NextResponse.json({ success: false, message: "Failed to process event review." }, { status: 500 });
  }
}

