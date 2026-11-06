import { NextResponse } from "next/server";
import { requireAuth, AuthorizationError } from "@/lib/auth/rbac";
import { markAllNotificationsAsRead } from "@/lib/notifications/in-app";

/**
 * POST /api/notifications/mark-all-read
 * Marks all notifications for the authenticated user as read.
 */
export async function POST() {
  try {
    const user = await requireAuth();

    const modifiedCount = await markAllNotificationsAsRead(user.id);

    return NextResponse.json({
      success: true,
      modifiedCount,
      message: "All notifications marked as read.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    console.error("❌ Error marking all notifications as read:", error);
    return NextResponse.json(
      { success: false, message: "Failed to mark notifications as read." },
      { status: 500 }
    );
  }
}

