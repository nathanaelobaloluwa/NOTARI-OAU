import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { announcementService } from "@/services/announcement.service";
import { announcementReviewSchema } from "@/validators/announcement";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const validation = announcementReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await announcementService.reviewAnnouncement(
      id,
      session.user.id,
      validation.data
    );

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        announcement: result.announcement,
      },
      { status: result.status }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [ADMIN_ANNOUNCEMENT_REVIEW_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to review announcement", error: errorMsg },
      { status: 500 }
    );
  }
}
