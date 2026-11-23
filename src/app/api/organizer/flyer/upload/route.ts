import { NextRequest, NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { CloudinaryService } from "@/lib/storage/cloudinary";
import { MAX_FLYER_FILE_SIZE } from "@/lib/storage/validation";

/**
 * POST /api/organizer/flyer/upload
 * Securely uploads an event publicity flyer image.
 * Requires an authenticated, approved organizer or platform administrator.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApprovedOrganizer(false);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, message: "No image file provided in form data." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FLYER_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `Image exceeds the 5 MB limit (received ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await CloudinaryService.uploadFlyer(buffer, {
      organizerId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        url: result.secureUrl,
        publicId: result.publicId,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        provider: result.provider,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 401 });
    }
    if (err.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }

    const msg = err.message || "Failed to upload event flyer.";
    const isValidation =
      msg.includes("Unsupported file format") ||
      msg.includes("limit of 5 MB") ||
      msg.includes("Invalid image");

    return NextResponse.json(
      { success: false, message: msg },
      { status: isValidation ? 400 : 500 }
    );
  }
}
