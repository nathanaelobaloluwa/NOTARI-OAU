import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Bookmark } from "@/models/Bookmark";
import { USER_ROLES } from "@/constants/roles";
import { EVENT_STATUS } from "@/constants/oau";
import {
  StudentSavedEventsList,
  SavedEventItem,
} from "@/components/student/StudentSavedEventsList";

export const metadata = {
  title: "Saved Events | NOTARI Student Portal",
  description: "View and manage your bookmarked campus events on NOTARI 2.0.",
};

interface PopulatedEventLean {
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

export default async function StudentSavedEventsPage() {
  // 1. Authenticate user server-side
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/student/saved");
  }

  // 2. Strict role enforcement: Only students can access
  const role = (session.user as { role?: string }).role;
  if (role !== USER_ROLES.STUDENT) {
    if (role === USER_ROLES.ADMIN) {
      redirect("/admin");
    } else if (role === USER_ROLES.ORGANIZER) {
      redirect("/organizer");
    } else {
      redirect("/login");
    }
  }

  // 3. Connect to MongoDB and retrieve active saved bookmarks
  await connectToDatabase();

  const bookmarks = await Bookmark.find({ userId: session.user.id })
    .populate({
      path: "eventId",
      select:
        "title slug description venue startDate endDate flyerUrl category faculty isFree ticketTiers organizerName status",
    })
    .sort({ createdAt: -1 })
    .lean();

  // 4. Transform and filter only published events
  const savedEvents: SavedEventItem[] = bookmarks
    .filter((b) => {
      const evt = b.eventId as { status?: string } | null;
      return evt && evt.status === EVENT_STATUS.PUBLISHED;
    })
    .map((b) => {
      const evt = b.eventId as unknown as PopulatedEventLean;
      const lowestPrice = evt.isFree
        ? 0
        : evt.ticketTiers && evt.ticketTiers.length > 0
        ? Math.min(...evt.ticketTiers.map((t) => t.price))
        : 0;

      return {
        id: b._id.toString(),
        eventId: evt._id.toString(),
        title: evt.title,
        slug: evt.slug,
        organizerName: evt.organizerName,
        category: evt.category,
        venue: evt.venue,
        startDate: evt.startDate ? new Date(evt.startDate).toISOString() : "",
        endDate: evt.endDate ? new Date(evt.endDate).toISOString() : "",
        flyerUrl: evt.flyerUrl,
        isFree: Boolean(evt.isFree),
        lowestPrice,
      };
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Saved Events
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Bookmarked events you are considering attending on campus.
        </p>
      </div>

      {/* Interactive Saved Events Component */}
      <StudentSavedEventsList initialBookmarks={savedEvents} />
    </div>
  );
}
