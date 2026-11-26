import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { CloudinaryService } from "@/lib/storage/cloudinary";
import { validateImageBuffer } from "@/lib/storage/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/user/profile-photo
 * Handles authenticated profile photo upload.
 * Enforces server-side authentication, binary magic-byte inspection (JPEG, PNG, WebP),
 * 5MB size limit, dedicated Cloudinary storage namespace, and atomic cleanup of previous asset.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to update profile photo." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No photograph file provided." },
        { status: 400 }
      );
    }

    // Convert file to binary buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate genuine magic bytes and file size
    const validation = validateImageBuffer(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error || "Invalid image file format." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    // 1. Remember previous asset identifier
    const oldPublicId = user.profilePhotoPublicId;
    const oldUrl = user.profilePhotoUrl || user.image;

    // 2. Upload new asset to storage under dedicated namespace
    const uploadResult = await CloudinaryService.uploadProfilePhoto(buffer, {
      userId: user._id.toString(),
    });

    // 3. Atomically persist new photo to MongoDB
    user.profilePhotoUrl = uploadResult.secureUrl;
    user.profilePhotoPublicId = uploadResult.publicId;
    user.image = uploadResult.secureUrl;
    await user.save();

    // 4. Safely delete old asset ONLY AFTER database update has succeeded
    if (oldPublicId || (oldUrl && oldUrl !== uploadResult.secureUrl)) {
      try {
        await CloudinaryService.deleteProfilePhoto(oldPublicId || oldUrl!);
      } catch (cleanupErr) {
        console.warn("⚠️ Non-critical failure cleaning up previous profile photo asset:", cleanupErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile photograph updated successfully.",
        photoUrl: uploadResult.secureUrl,
        publicId: uploadResult.publicId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Profile photo upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: (error as Error).message || "An unexpected error occurred while uploading photograph.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile-photo
 * Handles authenticated profile photo removal.
 * Clears database fields and removes asset from Cloudinary storage.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to remove profile photo." },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    const oldPublicId = user.profilePhotoPublicId;
    const oldUrl = user.profilePhotoUrl || user.image;

    // 1. Clear profile photo fields in MongoDB
    user.profilePhotoUrl = undefined;
    user.profilePhotoPublicId = undefined;
    user.image = undefined;
    await user.save();

    // 2. Clean up asset in Cloudinary/local storage
    const targetAsset = oldPublicId || oldUrl;
    if (targetAsset) {
      try {
        await CloudinaryService.deleteProfilePhoto(targetAsset);
      } catch (cleanupErr) {
        console.warn("⚠️ Non-critical failure deleting profile photo asset:", cleanupErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile photograph removed successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Profile photo removal error:", error);
    return NextResponse.json(
      {
        success: false,
        message: (error as Error).message || "An unexpected error occurred while removing photograph.",
      },
      { status: 500 }
    );
  }
}
