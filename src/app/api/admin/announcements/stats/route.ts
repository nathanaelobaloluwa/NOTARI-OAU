import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { announcementService } from "@/services/announcement.service";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user?.id || role !== USER_ROLES.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const stats = await announcementService.getAdminStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [ADMIN_ANNOUNCEMENT_STATS_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve announcement stats", error: errorMsg },
      { status: 500 }
    );
  }
}
