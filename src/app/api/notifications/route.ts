import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthorizationError } from "@/lib/auth/rbac";
import { getUserNotifications } from "@/lib/notifications/in-app";

/**
 * GET /api/notifications
 * Retrieves notifications and unread count for authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const data = await getUserNotifications(user.id, limit);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    console.error("❌ Error retrieving user notifications:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

