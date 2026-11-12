import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { announcementService } from "@/services/announcement.service";
import {
  announcementCreateSchema,
  announcementQuerySchema,
} from "@/validators/announcement";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = announcementQuerySchema.safeParse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 15,
      status: searchParams.get("status") || undefined,
      category: searchParams.get("category") || undefined,
      priority: searchParams.get("priority") || undefined,
      search: searchParams.get("search") || undefined,
      authorId: searchParams.get("authorId") || undefined,
      eventId: searchParams.get("eventId") || undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query parameters", errors: parsedQuery.error.format() },
        { status: 400 }
      );
    }

    const result = await announcementService.getAdminAnnouncements(parsedQuery.data);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [ADMIN_ANNOUNCEMENTS_GET_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve announcements", error: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = announcementCreateSchema.safeParse(body);

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

    const result = await announcementService.createAnnouncement(
      {
        id: session.user.id,
        role: USER_ROLES.ADMIN,
        name: session.user.name || "Administrator",
      },
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
    console.error("❌ [ADMIN_ANNOUNCEMENTS_POST_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to create announcement", error: errorMsg },
      { status: 500 }
    );
  }
}
