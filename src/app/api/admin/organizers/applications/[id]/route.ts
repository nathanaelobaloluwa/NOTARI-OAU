import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { OrganizerApplication } from "@/models/OrganizerApplication";
import { OrganizerProfile } from "@/models/OrganizerProfile";
import { USER_ROLES } from "@/constants/roles";
import mongoose from "mongoose";

/**
 * GET /api/admin/organizers/applications/[id]
 * Retrieve detailed organizer application record for Superadmin review
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (session.user.role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Superadmin access required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid application ID." }, { status: 400 });
    }

    await connectToDatabase();

    const application = await OrganizerApplication.findById(id)
      .populate("userId", "name email role isOrganizer matricNumber faculty department phone")
      .populate("reviewerId", "name email")
      .lean();

    if (!application) {
      return NextResponse.json({ success: false, message: "Application not found." }, { status: 404 });
    }

    const existingProfile = await OrganizerProfile.findOne({ userId: application.userId }).lean();

    return NextResponse.json(
      {
        success: true,
        application,
        existingProfile: existingProfile || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error fetching application details for admin:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch application details." },
      { status: 500 }
    );
  }
}

