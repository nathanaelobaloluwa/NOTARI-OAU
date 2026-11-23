import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { CloudinaryService } from "@/lib/storage/cloudinary";

/**
 * DELETE /api/organizer/flyer/delete
 * Deletes or cleans up an unlinked or replaced event flyer asset.
 * Enforces multi-tenant resource ownership:
 * - Organizers can only delete flyers associated with events they own, or unattached assets they uploaded.
 * - An organizer cannot delete another organizer's event flyer or unattached image.
 * - Superadmins retain universal oversight.
 * - System campus presets are protected from deletion.
 * - Synchronizes with the database if the asset was linked to an active event.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireApprovedOrganizer(false);

    const body = await req.json().catch(() => ({}));
    const publicIdOrUrl = body.publicIdOrUrl || body.url || body.publicId;

    if (!publicIdOrUrl || typeof publicIdOrUrl !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing publicIdOrUrl parameter." },
        { status: 400 }
      );
    }

    const trimmedUrl = publicIdOrUrl.trim();

    // 1. Guard against deleting system campus photography presets or external URLs
    if (trimmedUrl.startsWith("/images/oau/") || trimmedUrl.includes("images.unsplash.com")) {
      return NextResponse.json(
        { success: false, message: "Cannot delete system campus presets or external imagery." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 2. Resource ownership verification:
    // Check if the flyer is attached to any existing event in MongoDB
    const eventId = body.eventId;
    const linkedEvent =
      eventId && mongoose.Types.ObjectId.isValid(eventId)
        ? await Event.findById(eventId)
        : await Event.findOne({
            $or: [{ flyerUrl: trimmedUrl }, { flyerImage: trimmedUrl }],
          });

    if (linkedEvent) {
      // Ownership check: must be event owner or admin
      const isOwner =
        linkedEvent.organizerId.toString() === user.id ||
        Boolean(user.organizerProfile && linkedEvent.organizerId.toString() === user.organizerProfile._id.toString());

      if (user.role !== "admin" && !isOwner) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden: You cannot delete a flyer belonging to another organizer's event.",
          },
          { status: 403 }
        );
      }

      // Synchronize database record if the deleted flyer is actively set
      if (
        linkedEvent.flyerUrl === trimmedUrl ||
        (linkedEvent as unknown as { flyerImage?: string }).flyerImage === trimmedUrl
      ) {
        linkedEvent.flyerUrl = undefined;
        if ((linkedEvent as unknown as { flyerImage?: string }).flyerImage) {
          (linkedEvent as unknown as { flyerImage?: string }).flyerImage = undefined;
        }
        await linkedEvent.save();
      }
    } else if (user.role !== "admin") {
      // 3. Unattached asset: verify the organizer uploaded it
      const isUserAsset =
        trimmedUrl.includes(`org_${user.id}_`) ||
        trimmedUrl.includes(`/${user.id}/`) ||
        trimmedUrl.includes(user.id);

      if (!isUserAsset) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden: You cannot delete an unattached flyer uploaded by another user.",
          },
          { status: 403 }
        );
      }
    }

    // 4. Physical / Cloudinary deletion
    const result = await CloudinaryService.deleteFlyer(trimmedUrl);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to delete asset." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Asset cleaned up successfully." },
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
    return NextResponse.json(
      { success: false, message: err.message || "Failed to delete flyer asset." },
      { status: 500 }
    );
  }
}
