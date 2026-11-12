import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { announcementService } from "@/services/announcement.service";
import { announcementQuerySchema } from "@/validators/announcement";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = announcementQuerySchema.safeParse({
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 15,
      category: searchParams.get("category") || undefined,
      priority: searchParams.get("priority") || undefined,
      search: searchParams.get("search") || undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query parameters", errors: parsedQuery.error.format() },
        { status: 400 }
      );
    }

    const result = await announcementService.getStudentFeed(
      session.user.id,
      parsedQuery.data
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [STUDENT_ANNOUNCEMENTS_GET_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve student announcements", error: errorMsg },
      { status: 500 }
    );
  }
}
