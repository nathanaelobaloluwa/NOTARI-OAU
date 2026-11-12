import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { announcementService } from "@/services/announcement.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const marked = await announcementService.markAsRead(id, session.user.id);

    return NextResponse.json({
      success: marked,
      message: marked ? "Announcement marked as read." : "Could not mark announcement as read.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [STUDENT_ANNOUNCEMENT_READ_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to mark announcement as read", error: errorMsg },
      { status: 500 }
    );
  }
}
