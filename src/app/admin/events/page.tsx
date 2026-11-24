import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { EVENT_CATEGORIES, EVENT_STATUS } from "@/constants/oau";
import { PlusCircle, Search, Calendar, MapPin, Eye, Edit } from "lucide-react";

interface AdminEventsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    category?: string;
  }>;
}

export default async function AdminEventsManagementPage({ searchParams }: AdminEventsPageProps) {
  await connectToDatabase();
  const resolved = await searchParams;

  const search = resolved.search?.trim() || "";
  const status = resolved.status?.trim() || "";
  const category = resolved.category?.trim() || "";

  const query: Record<string, unknown> = {};

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { title: regex },
      { organizerName: regex },
      { venue: regex },
      { description: regex },
    ];
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (category && category !== "all") {
    query.category = category;
  }

  const events = await Event.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const totalEventsCount = await Event.countDocuments();
  const filteredCount = events.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            Events Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Superadmin directory of all scheduled, pending, published, and archived OAU events.
          </p>
        </div>

        <Link href="/admin/events/create">
          <Button className="rounded-xl px-4 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-xs">
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by event title, organizer..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <select
              name="status"
              defaultValue={status || "all"}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Statuses (Published, Pending, Draft, Rejected)</option>
              <option value={EVENT_STATUS.PUBLISHED}>Published</option>
              <option value={EVENT_STATUS.PENDING_APPROVAL}>Pending Approval</option>
              <option value={EVENT_STATUS.DRAFT}>Draft</option>
              <option value={EVENT_STATUS.REJECTED}>Rejected</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              name="category"
              defaultValue={category || "all"}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Categories</option>
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" className="h-10 px-4 rounded-xl text-xs font-semibold shrink-0">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      <div className="text-xs text-slate-500 px-1">
        Showing <strong>{filteredCount}</strong> of <strong>{totalEventsCount}</strong> total campus events
      </div>

      {/* Events Listing */}
      {events.length === 0 ? (
        <Card className="p-12 text-center border-slate-200/80 bg-white shadow-xs space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-700">No events found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No events match your current filter criteria. Try adjusting your search term or filters.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Events Cards (< md) */}
          <div className="space-y-3 md:hidden">
            {events.map((evt) => {
              const startDate = new Date(evt.startDate);
              const formattedDate = startDate.toLocaleDateString("en-NG", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const totalCapacity = (evt.ticketTiers || []).reduce((acc: number, t: { capacity: number }) => acc + (t.capacity || 0), 0);

              return (
                <Card key={evt._id.toString()} className="p-4 border-slate-200/80 bg-white shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#101C3A] truncate">{evt.title}</h3>
                      <p className="text-xs text-slate-400 truncate">{evt.organizerName}</p>
                    </div>
                    <StatusPill status={evt.status} />
                  </div>

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p>{formattedDate} • {evt.venue}</p>
                    <p className="text-slate-400 text-[11px] font-medium">Capacity: {totalCapacity} attendees max</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link href={`/events/${evt.slug}`} className="text-slate-400 hover:text-slate-600 font-medium text-[11px]">
                      Public Preview
                    </Link>
                    <Link href={`/admin/events/${evt._id.toString()}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-blue-600 border-blue-200">
                        Manage Event
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Events Table (>= md) */}
          <Card className="hidden md:block p-6 border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Event Title</th>
                    <th className="pb-3">Organizer</th>
                    <th className="pb-3">Date & Time</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Max Capacity</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((evt) => {
                    const startDate = new Date(evt.startDate);
                    const formattedDate = startDate.toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const formattedTime = startDate.toLocaleTimeString("en-NG", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });
                    const totalCapacity = (evt.ticketTiers || []).reduce((acc: number, t: { capacity: number }) => acc + (t.capacity || 0), 0);

                    return (
                      <tr key={evt._id.toString()} className="hover:bg-slate-50/60">
                        <td className="py-3.5 font-bold text-[#101C3A] max-w-[200px] truncate">
                          {evt.title}
                        </td>
                        <td className="py-3.5 text-slate-500 max-w-[140px] truncate">{evt.organizerName}</td>
                        <td className="py-3.5 text-slate-500 text-[11px]">
                          {formattedDate} • {formattedTime}
                        </td>
                        <td className="py-3.5 text-slate-600 truncate max-w-[140px]">{evt.venue}</td>
                        <td className="py-3.5 text-slate-700 font-medium">{totalCapacity}</td>
                        <td className="py-3.5">
                          <StatusPill status={evt.status} />
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <Link href={`/admin/events/${evt._id.toString()}`}>
                            <button className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]">
                              Review / Edit
                            </button>
                          </Link>
                          <Link href={`/events/${evt.slug}`}>
                            <button className="text-slate-400 hover:text-slate-600 font-semibold text-[11px]">
                              Preview
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
