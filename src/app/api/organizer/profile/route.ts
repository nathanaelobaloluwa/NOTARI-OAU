import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { OrganizerProfile } from "@/models/OrganizerProfile";
import { organizerProfileUpdateSchema } from "@/validators/organizer";
import { ORGANIZER_STATUS } from "@/constants/roles";

/**
 * GET /api/organizer/profile
 * Retrieve authenticated organizer's profile from MongoDB
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const profile = await OrganizerProfile.findOne({ userId: session.user.id }).lean();
    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Organizer profile not found." },
        { status: 404 }
      );
    }

    // Server-side database verification of approval status
    if (profile.status !== ORGANIZER_STATUS.APPROVED) {
      return NextResponse.json(
        {
          success: false,
          message: "Organizer access is not granted. Your profile status is currently pending or restricted.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, profile }, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching organizer profile:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve organizer profile." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizer/profile
 * Update permitted profile fields for the authenticated approved organizer
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = organizerProfileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed. Please verify your profile fields.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify existing profile and approved status in MongoDB
    const profile = await OrganizerProfile.findOne({ userId: session.user.id });
    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Organizer profile does not exist." },
        { status: 404 }
      );
    }

    if (profile.status !== ORGANIZER_STATUS.APPROVED) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot update profile: Your organizer accreditation is not currently approved.",
        },
        { status: 403 }
      );
    }

    const updates = validation.data;

    // Apply only permitted fields (whitelisted protection against prototype or privilege pollution)
    if (updates.displayName !== undefined) profile.displayName = updates.displayName;
    if (updates.organizationName !== undefined) profile.organizationName = updates.organizationName;
    if (updates.description !== undefined) profile.description = updates.description;
    if (updates.contactPhone !== undefined) profile.contactPhone = updates.contactPhone;
    if (updates.contactEmail !== undefined) profile.contactEmail = updates.contactEmail;
    if (updates.faculty !== undefined) profile.faculty = updates.faculty;
    if (updates.department !== undefined) profile.department = updates.department;
    if (updates.website !== undefined) profile.website = updates.website;
    if (updates.socialLinks !== undefined) {
      profile.socialLinks = {
        ...profile.socialLinks,
        ...updates.socialLinks,
      };
    }

    await profile.save();

    return NextResponse.json(
      {
        success: true,
        message: "Organizer profile updated successfully.",
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error updating organizer profile:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update organizer profile." },
      { status: 500 }
    );
  }
}

