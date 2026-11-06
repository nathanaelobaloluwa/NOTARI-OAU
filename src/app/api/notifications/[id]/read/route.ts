import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthorizationError } from "@/lib/auth/rbac";
import { markNotificationAsRead } from "@/lib/notifications/in-app";

/**
 * PATCH /api/notifications/[id]/read
 * Marks a specific notification as read.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const marked = await markNotificationAsRead(id, user.id);

    if (!marked) {
      return NextResponse.json(
        { success: false, message: "Notification not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    console.error("❌ Error marking notification as read:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update notification." },
      { status: 500 }
    );
  }
}

