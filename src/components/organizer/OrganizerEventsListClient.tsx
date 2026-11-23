"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { EVENT_CATEGORIES, EVENT_STATUS } from "@/constants/oau";
import {
  PlusCircle,
  Calendar,
  MapPin,
  Eye,
  Edit,
  Search,
  RefreshCw,
  Send,
  Ticket,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface TicketTier {
  _id?: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
}

interface OrganizerEvent {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  description: string;
  category: string;
  venue: string;
  startDate: string;
  endDate: string;
  flyerUrl?: string;
  flyerImage?: string;
  isFree: boolean;
  ticketTiers: TicketTier[];
  totalCapacity: number;
  registeredCount: number;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

interface Metrics {
  total: number;
  published: number;
  pending: number;
  draft: number;
  rejected: number;
  totalAttendees: number;
}

export function OrganizerEventsListClient() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    published: 0,
    pending: 0,
    draft: 0,
    rejected: 0,
    totalAttendees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchQuery.trim().length > 0) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/organizer/events?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setEvents(data.events || []);
        if (data.metrics) setMetrics(data.metrics);
      } else {
        setErrorMessage(data.message || "Failed to load events.");
      }
    } catch (err) {
      console.error("Error fetching organizer events:", err);
      setErrorMessage("Could not connect to the server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSubmitForReview = async (eventId: string, title: string) => {
    if (!confirm(`Submit "${title}" for Superadmin review?`)) return;

    setSubmittingId(eventId);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/submit`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setActionMessage(`"${title}" submitted for Superadmin review!`);
        fetchEvents();
      } else {
        setErrorMessage(data.message || "Failed to submit event for review.");
      }
    } catch {
      setErrorMessage("Failed to submit event. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            My Campus Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Create, manage, and monitor your university events, ticket inventory, and attendees.
          </p>
        </div>

        <Link href="/organizer/events/create">
          <Button className="rounded-xl px-4 py-2 gap-2 bg-[#4F46E5] hover:bg-indigo-700 text-xs font-semibold shadow-sm">
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Button>
        </Link>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between shadow-xs">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-xs">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 block">Total Events</span>
          <p className="text-xl sm:text-2xl font-bold text-[#101C3A] mt-0.5">{metrics.total}</p>
        </Card>
        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 block">Published & Active</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">{metrics.published}</p>
        </Card>
        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <span className="text-[11px] font-medium text-amber-600 block">Pending Review</span>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-0.5">{metrics.pending}</p>
        </Card>
        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <span className="text-[11px] font-medium text-indigo-600 block">Total Registrations</span>
          <p className="text-xl sm:text-2xl font-bold text-[#101C3A] mt-0.5 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>{metrics.totalAttendees}</span>
          </p>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card className="p-4 border-slate-200/80 bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: "all", label: "All Events" },
              { id: EVENT_STATUS.PUBLISHED, label: "Published" },
              { id: EVENT_STATUS.PENDING_APPROVAL, label: "Pending" },
              { id: EVENT_STATUS.DRAFT, label: "Drafts" },
              { id: EVENT_STATUS.REJECTED, label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#101C3A] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Keyword Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by event title, venue, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 placeholder:text-slate-400"
          />
        </div>
      </Card>

      {/* Events Listing */}
      {loading ? (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#4F46E5] mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading your events from MongoDB...</p>
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300 bg-white space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-[#101C3A]">No events found</h3>
            <p className="text-xs text-slate-500">
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                ? "No events match your current filter parameters. Try clearing your filters."
                : "You haven't created any events yet. Get started by organizing your first Great Ife campus event!"}
            </p>
          </div>
          <Link href="/organizer/events/create">
            <Button className="rounded-xl px-5 py-2 text-xs font-semibold bg-[#4F46E5] hover:bg-indigo-700 gap-1.5 shadow-sm">
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Event</span>
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((evt) => {
            const start = new Date(evt.startDate);
            const dateStr = start.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const timeStr = start.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });

            const percentBooked =
              evt.totalCapacity > 0
                ? Math.min(100, Math.round((evt.registeredCount / evt.totalCapacity) * 100))
                : 0;

            const isDraft = evt.status === EVENT_STATUS.DRAFT;
            const isRejected = evt.status === EVENT_STATUS.REJECTED;
            const isPublished = evt.status === EVENT_STATUS.PUBLISHED;

            return (
              <Card
                key={evt._id}
                className="p-5 border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {/* Thumbnail / Flyer */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200">
                    {evt.flyerUrl || evt.flyerImage ? (
                      <Image
                        src={evt.flyerUrl || evt.flyerImage || ""}
                        alt={evt.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 64px, 80px"
                        unoptimized={(evt.flyerUrl || evt.flyerImage || "").startsWith("http")}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-indigo-50 to-purple-50">
                        <Sparkles className="w-6 h-6 text-indigo-300" />
                        <span className="text-[9px] font-bold text-indigo-400 mt-1 uppercase">OAU</span>
                      </div>
                    )}
                  </div>

                  {/* Main Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#4F46E5] bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        {evt.category}
                      </span>
                      <StatusPill status={evt.status} />
                      <span className="text-[11px] font-medium text-slate-400">
                        {evt.isFree ? "Free Event" : "Paid Event"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#101C3A] leading-snug truncate">
                      {evt.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {dateStr} • {timeStr}
                        </span>
                      </div>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>

                    {/* Rejection Feedback Callout */}
                    {isRejected && evt.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block">Superadmin Feedback:</strong>
                          <span>{evt.rejectionReason}</span>
                        </div>
                      </div>
                    )}

                    {/* Ticket Tier Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {evt.ticketTiers.map((tier, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-600 border border-slate-200/60"
                        >
                          <Ticket className="w-3 h-3 text-slate-400" />
                          <span>
                            {tier.name}: {tier.price === 0 ? "Free" : `₦${tier.price.toLocaleString()}`} (
                            {tier.capacity})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Attendance & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-0 border-slate-100 shrink-0">
                  {/* Capacity Bar */}
                  <div className="w-full sm:w-40 md:w-36 text-left sm:text-right">
                    <div className="flex justify-between sm:justify-end gap-2 text-xs mb-1">
                      <span className="text-slate-400">Bookings:</span>
                      <span className="font-bold text-[#101C3A]">
                        {evt.registeredCount} / {evt.totalCapacity}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${percentBooked}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {(isDraft || isRejected) && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmitForReview(evt._id, evt.title)}
                        disabled={submittingId === evt._id}
                        className="h-8 text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-xs"
                      >
                        {submittingId === evt._id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        <span>Submit for Review</span>
                      </Button>
                    )}

                    <Link href={`/organizer/events/${evt._id}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl gap-1.5 border-slate-200">
                        <Edit className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </Button>
                    </Link>

                    {isPublished && (
                      <Link href={`/events/${evt.slug}`} target="_blank">
                        <Button size="sm" variant="subtle" className="h-8 text-xs rounded-xl gap-1.5 text-indigo-600 hover:bg-indigo-50">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Public Page</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

