import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { updateEventSchema } from "@/validators/event";
import { EVENT_STATUS } from "@/constants/oau";

/**
 * GET /api/organizer/events/[id]
 * Fetch a specific event for the authenticated organizer
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprovedOrganizer(false);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid event ID format." }, { status: 400 });
    }

    await connectToDatabase();

    const event = await Event.findById(id).lean();
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Ownership check: must be the event owner or admin
    const isOwner =
      event.organizerId.toString() === user.id ||
      Boolean(user.organizerProfile && event.organizerId.toString() === user.organizerProfile._id.toString());

    if (user.role !== "admin" && !isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not have permission to view this event." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, event }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    if (err.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }
    console.error("❌ Error retrieving organizer event:", error);
    return NextResponse.json({ success: false, message: "Failed to retrieve event." }, { status: 500 });
  }
}

/**
 * PUT /api/organizer/events/[id]
 * Update an existing event with ownership and status protection
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userWithProfile = await requireApprovedOrganizer(true);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid event ID format." }, { status: 400 });
    }

    const body = await req.json();
    const validation = updateEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed. Please review your event inputs.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = validation.data;
    await connectToDatabase();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Ownership check
    const isOwner =
      event.organizerId.toString() === userWithProfile.id ||
      Boolean(userWithProfile.organizerProfile && event.organizerId.toString() === userWithProfile.organizerProfile._id.toString());

    if (userWithProfile.role !== "admin" && !isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You cannot modify events owned by another organizer." },
        { status: 403 }
      );
    }

    // Cannot edit cancelled events
    if (event.status === EVENT_STATUS.CANCELLED) {
      return NextResponse.json(
        { success: false, message: "Cancelled events cannot be modified." },
        { status: 400 }
      );
    }

    // If event is published and ticket tiers are updated: enforce safe editing rules
    if (payload.ticketTiers && payload.ticketTiers.length > 0) {
      if (event.status === EVENT_STATUS.PUBLISHED) {
        const newTotalCapacity = payload.ticketTiers.reduce((acc, t) => acc + t.capacity, 0);
        if (newTotalCapacity < event.registeredCount) {
          return NextResponse.json(
            {
              success: false,
              message: `Total capacity (${newTotalCapacity}) cannot be lower than current registered attendees (${event.registeredCount}).`,
            },
            { status: 400 }
          );
        }
      }

      // Prepare updated ticket tiers
      const updatedTiers = payload.ticketTiers.map((newTier) => {
        // Find matching existing tier if _id provided
        const existing = event.ticketTiers.find(
          (t) => t._id && newTier._id && t._id.toString() === newTier._id
        );

        const soldCount = existing ? existing.capacity - existing.available : 0;
        const newCapacity = Math.max(newTier.capacity, soldCount);
        const newAvailable = newCapacity - soldCount;

        return {
          _id: existing ? existing._id : new mongoose.Types.ObjectId(),
          name: newTier.name,
          price: newTier.price,
          capacity: newCapacity,
          available: newAvailable,
          description: newTier.description || "",
          maxPerOrder: newTier.maxPerOrder || 5,
          salesStartDate: newTier.salesStartDate ? new Date(newTier.salesStartDate) : undefined,
          salesEndDate: newTier.salesEndDate ? new Date(newTier.salesEndDate) : undefined,
        };
      });

      event.ticketTiers = updatedTiers;
      event.totalCapacity = updatedTiers.reduce((acc, t) => acc + t.capacity, 0);
    }

    // Apply field updates
    if (payload.title !== undefined) event.title = payload.title;
    if (payload.summary !== undefined) event.summary = payload.summary;
    if (payload.description !== undefined) event.description = payload.description;
    if (payload.category !== undefined) event.category = payload.category;
    if (payload.eventType !== undefined) event.eventType = payload.eventType;
    if (payload.faculty !== undefined) event.faculty = payload.faculty || undefined;
    if (payload.department !== undefined) event.department = payload.department || undefined;
    if (payload.venue !== undefined) event.venue = payload.venue;
    if (payload.address !== undefined) event.address = payload.address || undefined;
    if (payload.onlineDetails !== undefined) event.onlineDetails = payload.onlineDetails;
    if (payload.targetAudience !== undefined) event.targetAudience = payload.targetAudience || undefined;
    if (payload.tags !== undefined) event.tags = payload.tags;
    if (payload.contactEmail !== undefined) event.contactEmail = payload.contactEmail || userWithProfile.email;
    if (payload.contactPhone !== undefined) event.contactPhone = payload.contactPhone || undefined;
    if (payload.instructions !== undefined) event.instructions = payload.instructions || undefined;
    if (payload.startDate !== undefined) {
      const newStartDate = new Date(payload.startDate);
      if (!event.startDate || event.startDate.getTime() !== newStartDate.getTime()) {
        event.startDate = newStartDate;
      }
    }
    if (payload.endDate !== undefined) event.endDate = new Date(payload.endDate);
    if (payload.salesStartDate !== undefined) event.salesStartDate = payload.salesStartDate ? new Date(payload.salesStartDate) : undefined;
    if (payload.salesEndDate !== undefined) event.salesEndDate = payload.salesEndDate ? new Date(payload.salesEndDate) : undefined;
    const flyerToSet = payload.flyerUrl !== undefined ? payload.flyerUrl : payload.flyerImage;
    if (flyerToSet !== undefined) event.flyerUrl = flyerToSet || undefined;
    if (payload.galleryUrls !== undefined) event.galleryUrls = payload.galleryUrls;
    if (payload.isFree !== undefined) event.isFree = payload.isFree;

    // Resubmission rule: If rejected or draft and user chose pending_approval
    if (
      (event.status === EVENT_STATUS.DRAFT || event.status === EVENT_STATUS.REJECTED) &&
      payload.status === EVENT_STATUS.PENDING_APPROVAL
    ) {
      event.status = EVENT_STATUS.PENDING_APPROVAL;
      event.submittedAt = new Date();
      event.rejectionReason = undefined;
    }

    await event.save();

    return NextResponse.json(
      {
        success: true,
        message: "Event updated successfully.",
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
    console.error("❌ Error updating organizer event:", error);
    return NextResponse.json({ success: false, message: "Failed to update event." }, { status: 500 });
  }
}

/**
 * DELETE /api/organizer/events/[id]
 * Delete draft event (only if zero attendees registered)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprovedOrganizer(false);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid event ID." }, { status: 400 });
    }

    await connectToDatabase();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    const isOwner =
      event.organizerId.toString() === user.id ||
      Boolean(user.organizerProfile && event.organizerId.toString() === user.organizerProfile._id.toString());

    if (user.role !== "admin" && !isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not own this event." },
        { status: 403 }
      );
    }

    if (event.status !== EVENT_STATUS.DRAFT && event.status !== EVENT_STATUS.REJECTED) {
      return NextResponse.json(
        { success: false, message: "Only draft or rejected events can be deleted." },
        { status: 400 }
      );
    }

    if (event.registeredCount > 0) {
      return NextResponse.json(
        { success: false, message: "Events with active registrations cannot be deleted." },
        { status: 400 }
      );
    }

    await Event.findByIdAndDelete(id);

    return NextResponse.json(
      { success: true, message: "Event draft deleted successfully." },
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
    console.error("❌ Error deleting organizer event:", error);
    return NextResponse.json({ success: false, message: "Failed to delete event." }, { status: 500 });
  }
}

