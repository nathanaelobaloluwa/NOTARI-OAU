import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthorizationError, ForbiddenError } from "@/lib/auth/rbac";
import { checkInAttendeeQuerySchema } from "@/validators/check-in";
import { getEventAttendees } from "@/lib/tickets/check-in";

/**
 * GET /api/organizer/events/[id]/attendees
 * Retrieve attendee check-in records for manual search or offline cache.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: eventId } = await context.params;

    const { searchParams } = new URL(req.url);
    const query = checkInAttendeeQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || "all",
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 50,
    });

    const data = await getEventAttendees(eventId, user.id, query);

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
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 403 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to load event attendees.";
    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    );
  }
}

