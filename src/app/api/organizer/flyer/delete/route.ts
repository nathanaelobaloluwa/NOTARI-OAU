import { NextRequest, NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { CloudinaryService } from "@/lib/storage/cloudinary";

/**
 * DELETE /api/organizer/flyer/delete
 * Deletes or cleans up an unlinked or replaced event flyer asset.
 * Requires an authenticated, approved organizer or administrator.
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireApprovedOrganizer(false);

    const body = await req.json().catch(() => ({}));
    const publicIdOrUrl = body.publicIdOrUrl || body.url || body.publicId;

    if (!publicIdOrUrl || typeof publicIdOrUrl !== "string") {
      return NextResponse.json(
        { success: false, message: "Missing publicIdOrUrl parameter." },
        { status: 400 }
      );
    }

    const result = await CloudinaryService.deleteFlyer(publicIdOrUrl.trim());

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to delete asset." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Asset cleaned up successfully." }, { status: 200 });
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
