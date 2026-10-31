import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { bookmarkSchema, bookmarkQuerySchema } from "@/validators/bookmark";
import {
  saveBookmark,
  removeBookmark,
  getStudentBookmarks,
} from "@/lib/bookmarks/service";

/**
 * GET /api/bookmarks
 * Retrieve authenticated student's saved events or saved event IDs
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Only registered students can access saved bookmarks",
        },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const queryValidation = bookmarkQuerySchema.safeParse({
      idsOnly: searchParams.get("idsOnly") || undefined,
    });

    const idsOnly = queryValidation.success ? queryValidation.data.idsOnly : false;

    const result = await getStudentBookmarks(session.user.id, idsOnly);
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Error retrieving bookmarks:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while retrieving saved events",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookmarks
 * Save an event to student's bookmarks
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to bookmark events" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Only registered students can save events to bookmarks",
        },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = bookmarkSchema.safeParse(body);
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

    const result = await saveBookmark({
      userId: session.user.id,
      eventId: validation.data.eventId,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Error saving bookmark:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while saving the event",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookmarks
 * Remove an event from student's bookmarks
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Only registered students can manage bookmarks",
        },
        { status: 403 }
      );
    }

    // Support eventId from search query parameter or JSON body
    let targetEventId = req.nextUrl.searchParams.get("eventId");
    if (!targetEventId) {
      try {
        const body = (await req.json()) as { eventId?: string };
        targetEventId = body.eventId || null;
      } catch {
        // Body optional if provided in query string
      }
    }

    const validation = bookmarkSchema.safeParse({ eventId: targetEventId });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid eventId is required to remove a bookmark",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await removeBookmark({
      userId: session.user.id,
      eventId: validation.data.eventId,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Error removing bookmark:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while removing the event bookmark",
      },
      { status: 500 }
    );
  }
}
