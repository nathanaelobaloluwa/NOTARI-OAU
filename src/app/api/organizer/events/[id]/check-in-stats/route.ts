import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthorizationError, ForbiddenError } from "@/lib/auth/rbac";
import { getEventCheckInStats } from "@/lib/tickets/check-in";

/**
 * GET /api/organizer/events/[id]/check-in-stats
 * Real-time event check-in counts, attendance percentage, and recent door activity.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: eventId } = await context.params;

    const stats = await getEventCheckInStats(eventId, user.id);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 403 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to load check-in statistics.";
    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    );
  }
}

