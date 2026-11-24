import React from "react";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { BookmarkButton } from "@/components/events/BookmarkButton";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { Bookmark } from "@/models/Bookmark";
import { USER_ROLES } from "@/constants/roles";
import { EVENT_CATEGORIES, EVENT_STATUS, OAU_FACULTIES, formatFacultyLabel, buildFacultyQueryRegex } from "@/constants/oau";
import { eventFilterSchema } from "@/validators/event";
import {
  Search,
  Calendar,
  MapPin,
  ArrowRight,
  Filter,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface EventsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    faculty?: string;
    date?: string;
    isFree?: string;
    page?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const resolvedParams = await searchParams;
  const parsed = eventFilterSchema.safeParse(resolvedParams);
  const filters = parsed.success
    ? parsed.data
    : { page: 1, limit: 9 };

  await connectToDatabase();

  // 1. Strict public visibility rule: only approved and published events
  const mongoQuery: Record<string, unknown> = {
    status: EVENT_STATUS.PUBLISHED,
  };

  // 2. Keyword search
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escaped, "i");
    mongoQuery.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { organizerName: searchRegex },
      { venue: searchRegex },
    ];
  }

  // 3. Category filter
  if (filters.category) {
    mongoQuery.category = filters.category;
  }

  // 4. Faculty filter
  if (filters.faculty) {
    mongoQuery.faculty = buildFacultyQueryRegex(filters.faculty);
  }

  // 5. Free / Paid filter
  if (filters.isFree !== undefined) {
    mongoQuery.isFree = filters.isFree === "true";
  }

  // 6. Date filtering
  if (filters.date) {
    const now = new Date();
    if (filters.date === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      mongoQuery.startDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters.date === "this_week") {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      mongoQuery.startDate = { $gte: now, $lte: endOfWeek };
    } else if (filters.date === "this_month") {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      mongoQuery.startDate = { $gte: now, $lte: endOfMonth };
    }
  }

  const page = filters.page || 1;
  const limit = filters.limit || 9;
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    Event.find(mongoQuery)
      .select("-rejectionReason")
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(mongoQuery),
  ]);

  // Query authenticated student bookmarks to show active state on cards
  const session = await auth();
  const isStudent = session?.user && (session.user as { role?: string }).role === USER_ROLES.STUDENT;
  let savedEventIds = new Set<string>();
  if (isStudent && session?.user?.id) {
    const studentBookmarks = await Bookmark.find({ userId: session.user.id })
      .select("eventId")
      .lean();
    savedEventIds = new Set(studentBookmarks.map((b) => b.eventId.toString()));
  }

  const totalPages = Math.ceil(total / limit);

  // Helper to build pagination query URLs
  function buildPageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.faculty) params.set("faculty", filters.faculty);
    if (filters.date) params.set("date", filters.date);
    if (filters.isFree !== undefined) params.set("isFree", filters.isFree);
    params.set("page", String(targetPage));
    return `/events?${params.toString()}`;
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.faculty || filters.date || filters.isFree !== undefined
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* 1. Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-notari-primary uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Great Ife Campus Events</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-notari-dark tracking-tight">
          Explore Campus Events
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
          Discover conferences, faculty symposiums, workshops, concerts, and gatherings happening across Obafemi Awolowo University.
        </p>
      </div>

      {/* 2. Search, Filter, and Sort Control Form */}
      <Card className="p-4 sm:p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl">
        <form method="GET" action="/events" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative flex items-center lg:col-span-2">
              <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={filters.search || ""}
                placeholder="Search event title, venue, or organizer..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs text-notari-dark placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                name="category"
                defaultValue={filters.category || ""}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20 cursor-pointer"
              >
                <option value="">All Categories</option>
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Faculty Dropdown */}
            <div>
              <select
                name="faculty"
                defaultValue={filters.faculty || ""}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20 cursor-pointer"
              >
                <option value="">All Faculties</option>
                {OAU_FACULTIES.map((fac) => (
                  <option key={fac} value={fac}>
                    {formatFacultyLabel(fac)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Window Dropdown */}
            <div>
              <select
                name="date"
                defaultValue={filters.date || ""}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20 cursor-pointer"
              >
                <option value="">Any Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>

          {/* Secondary Controls Bar: Admission Type & Filter Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium shrink-0">Admission:</label>
              <select
                name="isFree"
                defaultValue={filters.isFree ?? ""}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20 cursor-pointer"
              >
                <option value="">All Admission Types</option>
                <option value="true">Free Only</option>
                <option value="false">Paid Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {hasActiveFilters && (
                <Link href="/events">
                  <Button type="button" variant="ghost" size="sm" className="h-9 px-3 text-xs font-medium text-slate-500 hover:text-slate-800 gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </Button>
                </Link>
              )}
              <Button type="submit" size="sm" className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 shadow-sm">
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* 3. Event Count & Status Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-notari-dark">{events.length}</strong> of{" "}
          <strong className="text-notari-dark">{total}</strong> published {total === 1 ? "event" : "events"}
        </span>
        {hasActiveFilters && (
          <span className="text-notari-primary font-medium">Filtered results</span>
        )}
      </div>

      {/* 4. Events Listing Grid or Polished Empty State */}
      {events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => {
            const startDate = new Date(evt.startDate);
            const formattedDate = startDate.toLocaleDateString("en-NG", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const formattedTime = startDate.toLocaleTimeString("en-NG", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            const lowestPrice = evt.isFree
              ? 0
              : evt.ticketTiers && evt.ticketTiers.length > 0
              ? Math.min(...evt.ticketTiers.map((t) => t.price))
              : 0;

            const priceDisplay = evt.isFree || lowestPrice === 0 ? "Free" : `₦${lowestPrice.toLocaleString()}`;

            return (
              <Card
                key={evt._id.toString()}
                className="overflow-hidden border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col justify-between rounded-2xl bg-white"
              >
                <div>
                  {/* Event Cover Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    {evt.flyerUrl || (evt as { flyerImage?: string }).flyerImage ? (
                      <Image
                        src={evt.flyerUrl || (evt as { flyerImage?: string }).flyerImage || ""}
                        alt={evt.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={(evt.flyerUrl || (evt as { flyerImage?: string }).flyerImage || "").startsWith("http")}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-indigo-50 to-purple-100 text-notari-primary p-4 text-center">
                        <Calendar className="w-8 h-8 mb-1 opacity-70" />
                        <span className="text-xs font-bold uppercase tracking-wider">{evt.category}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                      <Badge variant="secondary" className="text-[11px] shadow-sm font-semibold">
                        {evt.category}
                      </Badge>
                      {evt.isFree && <StatusPill status="free" />}
                    </div>
                    <div className="absolute top-3 right-3 z-10">
                      <BookmarkButton
                        eventId={evt._id.toString()}
                        initialIsBookmarked={savedEventIds.has(evt._id.toString())}
                        isAuthenticated={Boolean(session?.user?.id)}
                        isStudent={Boolean(isStudent)}
                        variant="floating"
                      />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <p className="text-xs font-semibold text-slate-400 truncate">
                      {evt.organizerName}
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-notari-dark group-hover:text-notari-primary transition-colors line-clamp-1">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="pt-2 space-y-1.5 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-notari-primary shrink-0" />
                        <span>{formattedDate} • {formattedTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-notari-primary shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Admission</span>
                    <span className="text-sm font-extrabold text-notari-dark">
                      {priceDisplay}
                    </span>
                  </div>

                  <Link href={`/events/${evt.slug}`}>
                    <Button size="sm" className="rounded-xl px-4 text-xs font-semibold gap-1.5">
                      <span>View Event</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Polished Empty State */
        <Card className="p-8 sm:p-12 border-slate-200/80 bg-white text-center space-y-4 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-notari-primary flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-notari-dark">
              {hasActiveFilters ? "No matching events found" : "No campus events published yet"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {hasActiveFilters
                ? "We couldn't find any published events matching your selected criteria. Try adjusting your search term or clearing your category filters."
                : "Upcoming Great Ife symposiums, tech summits, conferences, and student gatherings will appear here once approved and published."}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            {hasActiveFilters ? (
              <Link href="/events">
                <Button className="rounded-xl text-xs font-semibold gap-2 shadow-sm">
                  <RotateCcw className="w-4 h-4" />
                  <span>Clear All Filters</span>
                </Button>
              </Link>
            ) : (
              <Link href="/student">
                <Button variant="outline" className="rounded-xl text-xs font-semibold gap-2">
                  <span>Go to Student Portal</span>
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* 5. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <Link
            href={buildPageUrl(Math.max(1, page - 1))}
            className={page <= 1 ? "pointer-events-none opacity-40" : undefined}
          >
            <Button variant="outline" size="sm" disabled={page <= 1} className="rounded-xl text-xs font-semibold">
              Previous
            </Button>
          </Link>

          <span className="text-xs text-slate-500 font-medium">
            Page <strong className="text-notari-dark">{page}</strong> of{" "}
            <strong className="text-notari-dark">{totalPages}</strong>
          </span>

          <Link
            href={buildPageUrl(Math.min(totalPages, page + 1))}
            className={page >= totalPages ? "pointer-events-none opacity-40" : undefined}
          >
            <Button variant="outline" size="sm" disabled={page >= totalPages} className="rounded-xl text-xs font-semibold">
              Next
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
