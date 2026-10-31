import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Bookmark, Event, User } from "@/models";
import { USER_ROLES } from "@/constants/roles";
import { EVENT_STATUS } from "@/constants/oau";

export interface SaveBookmarkParams {
  userId: string;
  eventId: string;
}

export interface BookmarkServiceResult {
  success: boolean;
  status: number;
  message: string;
  data?: unknown;
}

/**
 * Save an event to student's bookmarks
 */
export async function saveBookmark({
  userId,
  eventId,
}: SaveBookmarkParams): Promise<BookmarkServiceResult> {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(eventId)) {
    return {
      success: false,
      status: 400,
      message: "Invalid student or event identifier",
    };
  }

  await connectToDatabase();

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const eventObjectId = new mongoose.Types.ObjectId(eventId);

  // 1. Verify student role
  const student = await User.findById(userObjectId).select("role").lean();
  if (!student) {
    return {
      success: false,
      status: 404,
      message: "Student account not found",
    };
  }

  if (student.role !== USER_ROLES.STUDENT) {
    return {
      success: false,
      status: 403,
      message: "Only registered students can save events to bookmarks",
    };
  }

  // 2. Verify event exists and is published
  const event = await Event.findById(eventObjectId).select("status title").lean();
  if (!event) {
    return {
      success: false,
      status: 404,
      message: "Event not found",
    };
  }

  if (event.status !== EVENT_STATUS.PUBLISHED) {
    return {
      success: false,
      status: 400,
      message: "Only published campus events can be saved to bookmarks",
    };
  }

  // 3. Save bookmark with duplicate prevention
  try {
    const existing = await Bookmark.findOne({
      userId: userObjectId,
      eventId: eventObjectId,
    });

    if (existing) {
      return {
        success: true,
        status: 200,
        message: "Event is already saved in your bookmarks",
        data: {
          bookmarkId: existing._id.toString(),
          eventId: eventId,
          alreadySaved: true,
        },
      };
    }

    const bookmark = await Bookmark.create({
      userId: userObjectId,
      eventId: eventObjectId,
    });

    return {
      success: true,
      status: 201,
      message: "Event saved to bookmarks successfully",
      data: {
        bookmarkId: bookmark._id.toString(),
        eventId: eventId,
        alreadySaved: false,
      },
    };
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 11000) {
      // Caught race condition duplicate insertion
      return {
        success: true,
        status: 200,
        message: "Event is already saved in your bookmarks",
        data: {
          eventId: eventId,
          alreadySaved: true,
        },
      };
    }
    console.error("❌ Failed to save bookmark:", error);
    return {
      success: false,
      status: 500,
      message: "An unexpected error occurred while saving the event",
    };
  }
}

/**
 * Remove an event from student's bookmarks
 */
export async function removeBookmark({
  userId,
  eventId,
}: SaveBookmarkParams): Promise<BookmarkServiceResult> {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(eventId)) {
    return {
      success: false,
      status: 400,
      message: "Invalid student or event identifier",
    };
  }

  await connectToDatabase();

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const eventObjectId = new mongoose.Types.ObjectId(eventId);

  const deleted = await Bookmark.findOneAndDelete({
    userId: userObjectId,
    eventId: eventObjectId,
  });

  return {
    success: true,
    status: 200,
    message: deleted
      ? "Event removed from bookmarks successfully"
      : "Event was not in your saved bookmarks",
    data: {
      eventId: eventId,
      removed: Boolean(deleted),
    },
  };
}

interface PopulatedBookmarkEventLean {
  _id: { toString(): string };
  title: string;
  slug: string;
  description?: string;
  venue: string;
  startDate?: Date;
  endDate?: Date;
  flyerUrl?: string;
  category: string;
  faculty?: string;
  isFree?: boolean;
  organizerName: string;
  ticketTiers?: Array<{ name: string; price: number }>;
  status: string;
}

/**
 * Get student's bookmarked events or IDs
 */
export async function getStudentBookmarks(
  userId: string,
  idsOnly: boolean = false
): Promise<BookmarkServiceResult> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      success: false,
      status: 400,
      message: "Invalid student identifier",
    };
  }

  await connectToDatabase();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (idsOnly) {
    const bookmarks = await Bookmark.find({ userId: userObjectId }).select("eventId").lean();
    const eventIds = bookmarks.map((b) => b.eventId.toString());
    return {
      success: true,
      status: 200,
      message: "Saved event IDs retrieved successfully",
      data: {
        savedEventIds: eventIds,
        count: eventIds.length,
      },
    };
  }

  // Populate event details
  const bookmarks = await Bookmark.find({ userId: userObjectId })
    .populate({
      path: "eventId",
      select:
        "title slug description venue startDate endDate flyerUrl category faculty isFree ticketTiers organizerName status",
    })
    .sort({ createdAt: -1 })
    .lean();

  // Filter for valid published events
  const validBookmarks = bookmarks
    .filter((b) => {
      const evt = b.eventId as { status?: string } | null;
      return evt && evt.status === EVENT_STATUS.PUBLISHED;
    })
    .map((b) => {
      const evt = b.eventId as unknown as PopulatedBookmarkEventLean;
      return {
        id: b._id.toString(),
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
        event: {
          id: evt._id.toString(),
          title: evt.title,
          slug: evt.slug,
          description: evt.description || "",
          venue: evt.venue,
          startDate: evt.startDate ? new Date(evt.startDate).toISOString() : "",
          endDate: evt.endDate ? new Date(evt.endDate).toISOString() : "",
          flyerUrl: evt.flyerUrl,
          category: evt.category,
          faculty: evt.faculty,
          isFree: Boolean(evt.isFree),
          organizerName: evt.organizerName,
          ticketTiers: evt.ticketTiers || [],
        },
      };
    });

  return {
    success: true,
    status: 200,
    message: "Saved events retrieved successfully",
    data: {
      bookmarks: validBookmarks,
      count: validBookmarks.length,
    },
  };
}

/**
 * Get count of active saved published events for a student
 */
export async function getStudentSavedCount(userId: string): Promise<number> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return 0;
  }

  await connectToDatabase();
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Match bookmarks where event is published
  const count = await Bookmark.countDocuments({ userId: userObjectId });
  return count;
}
