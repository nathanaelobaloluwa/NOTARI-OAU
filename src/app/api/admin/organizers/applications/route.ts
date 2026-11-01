import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { OrganizerApplication } from "@/models/OrganizerApplication";
import { USER_ROLES } from "@/constants/roles";
import { APPLICATION_STATUS, APPLICANT_TYPES } from "@/constants/organizer";

/**
 * GET /api/admin/organizers/applications
 * List organizer applications with filtering and pagination (Superadmin only)
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const query: Record<string, unknown> = {};

    if (statusParam && statusParam !== "all") {
      if ((Object.values(APPLICATION_STATUS) as string[]).includes(statusParam)) {
        query.status = statusParam;
      }
    }

    if (typeParam && typeParam !== "all") {
      if ((Object.values(APPLICANT_TYPES) as string[]).includes(typeParam)) {
        query.applicantType = typeParam;
      }
    }

    if (search && search.length > 0) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      query.$or = [
        { applicantName: searchRegex },
        { applicantEmail: searchRegex },
        { organizationName: searchRegex },
        { contactPersonName: searchRegex },
        { contactPersonEmail: searchRegex },
        { displayName: searchRegex },
      ];
    }

    const [applications, total] = await Promise.all([
      OrganizerApplication.find(query)
        .populate("userId", "name email role isOrganizer matricNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrganizerApplication.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        applications,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error listing organizer applications for admin:", error);
    return NextResponse.json(
      { success: false, message: "Failed to list organizer applications." },
      { status: 500 }
    );
  }
}

