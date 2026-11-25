"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Ticket as TicketIcon,
  Search,
  RotateCcw,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { StudentHistoryItem, HistoryCounts } from "@/lib/student/service";
import { EventFlyerImage } from "@/components/shared/event-flyer-image";
import { NotariEmptyState } from "@/components/shared/notari-empty-state";

interface StudentHistoryClientProps {
  initialItems: StudentHistoryItem[];
  counts: HistoryCounts;
}

export function StudentHistoryClient({
  initialItems,
  counts,
}: StudentHistoryClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "attended" | "past">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Filter by tab
  let tabFiltered = initialItems;
  if (activeTab === "upcoming") {
    tabFiltered = initialItems.filter((i) => i.isUpcoming);
  } else if (activeTab === "attended") {
    tabFiltered = initialItems.filter((i) => i.isAttended);
  } else if (activeTab === "past") {
    tabFiltered = initialItems.filter((i) => i.isPast);
  }

  // Filter by search query
  const filteredItems = tabFiltered.filter((i) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = i.event?.title.toLowerCase() || "";
    const venue = i.event?.venue.toLowerCase() || "";
    const ref = i.bookingReference.toLowerCase();
    const organizer = i.event?.organizerName.toLowerCase() || "";
    return title.includes(q) || venue.includes(q) || ref.includes(q) || organizer.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Booking & Attendance History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time chronological record of your campus event registrations, passes, and check-in verifications.
          </p>
        </div>

        <Link href="/student/tickets">
          <Button size="sm" variant="outline" className="rounded-xl h-10 text-xs font-semibold gap-2 self-start sm:self-auto shadow-sm">
            <TicketIcon className="w-4 h-4 text-emerald-600" />
            <span>View All Passes</span>
          </Button>
        </Link>
      </div>

      {/* 2. Interactive Navigation Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto no-scrollbar touch-manipulation">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-white text-notari-dark shadow-sm"
                : "text-slate-600 hover:text-notari-dark"
            }`}
          >
            <span>All Bookings</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "upcoming"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-indigo-600"
            }`}
          >
            <span>Upcoming</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-mono">
              {counts.upcoming}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attended")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "attended"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-emerald-600"
            }`}
          >
            <span>Attended</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-mono">
              {counts.attended}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "past"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Past Events</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {counts.past}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center w-full md:w-72">
          <Search className="absolute left-3.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event or booking ref..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-notari-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-notari-primary/20 shadow-sm"
          />
        </div>
      </div>

      {/* 3. History List / Cards */}
      {filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const eventDateFormatted = item.event?.startDate
              ? new Date(item.event.startDate).toLocaleDateString("en-NG", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Date TBA";

            const eventTimeFormatted = item.event?.startDate
              ? new Date(item.event.startDate).toLocaleTimeString("en-NG", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "";

            const bookingDateFormatted = new Date(item.bookedAt).toLocaleDateString("en-NG", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card
                key={item.id}
                className="p-5 sm:p-6 border-slate-200/80 bg-white hover:border-slate-300 transition-all rounded-2xl shadow-sm flex flex-col gap-4"
              >
                {/* Header row: Reference & Attendance Status */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">Booking Ref:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyRef(item.bookingReference)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Copy reference"
                    >
                      <span>{item.bookingReference}</span>
                      {copiedRef === item.bookingReference ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      • Booked on {bookingDateFormatted}
                    </span>
                  </div>

                  {/* Attendance status badge */}
                  <div>
                    {item.attendanceStatus === "attended" && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 px-2.5 py-1 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Attended & Verified</span>
                      </Badge>
                    )}
                    {item.attendanceStatus === "upcoming" && (
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 gap-1.5 px-2.5 py-1 text-[11px] font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Upcoming Event</span>
                      </Badge>
                    )}
                    {item.attendanceStatus === "not_attended" && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1.5 px-2.5 py-1 text-[11px] font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Past (Not Attended)</span>
                      </Badge>
                    )}
                    {item.attendanceStatus === "refunded" && (
                      <Badge className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 gap-1.5 px-2.5 py-1 text-[11px] font-semibold">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Refunded</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Main Event Details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                      <EventFlyerImage
                        src={item.event?.flyerUrl}
                        alt={item.event?.title || "Event"}
                        title={item.event?.title}
                        category={item.event?.category}
                        containerClassName="rounded-2xl"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.event?.category && (
                          <span className="text-[11px] font-bold uppercase tracking-wider text-notari-primary">
                            {item.event.category}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          by {item.event?.organizerName || "OAU Organizer"}
                        </span>
                      </div>

                      {item.event?.slug ? (
                        <Link href={`/events/${item.event.slug}`}>
                          <h3 className="text-base sm:text-lg font-bold text-notari-dark hover:text-notari-primary transition-colors line-clamp-1">
                            {item.event.title}
                          </h3>
                        </Link>
                      ) : (
                        <h3 className="text-base sm:text-lg font-bold text-notari-dark line-clamp-1">
                          {item.event?.title || "Great Ife Campus Event"}
                        </h3>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-notari-primary shrink-0" />
                          <span>{eventDateFormatted}{eventTimeFormatted ? ` • ${eventTimeFormatted}` : ""}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-notari-primary shrink-0" />
                          <span className="truncate">{item.event?.venue}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Tier Info */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 shrink-0">
                    <span className="text-xs text-slate-400 font-medium">
                      {item.quantity} {item.quantity === 1 ? "Ticket" : "Tickets"}
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-notari-dark">
                      {item.paymentChannel === "free" || item.totalAmount === 0
                        ? "Free Admission"
                        : `₦${item.totalAmount.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 text-xs">
                  <div className="text-slate-500">
                    {item.tickets.length > 0 ? (
                      <span className="font-medium">
                        Pass Codes:{" "}
                        {item.tickets.map((t, idx) => (
                          <span key={t.id} className="font-mono text-slate-700">
                            {t.ticketCode}
                            {idx < item.tickets.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-slate-400">1 Digital Pass issued</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href="/student/tickets">
                      <Button size="sm" variant="outline" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5">
                        <TicketIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Digital Pass</span>
                      </Button>
                    </Link>
                    {item.event?.slug && (
                      <Link href={`/events/${item.event.slug}`}>
                        <Button size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5">
                          <span>View Event</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Branded Empty State */
        <NotariEmptyState
          variant={searchQuery ? "search" : activeTab === "attended" ? "generic" : activeTab === "upcoming" ? "upcoming" : activeTab === "past" ? "past" : "events"}
          title={
            searchQuery
              ? "No matching records found"
              : activeTab === "attended"
              ? "No verified attendances yet"
              : activeTab === "upcoming"
              ? "No upcoming events registered"
              : activeTab === "past"
              ? "No past event registrations"
              : "No event booking history yet"
          }
          description={
            searchQuery
              ? "We couldn't find any history items matching your search. Try checking your spelling or clearing the query."
              : activeTab === "attended"
              ? "When event organizers scan and verify your digital QR ticket at the venue, your attendance status is automatically confirmed here."
              : activeTab === "upcoming"
              ? "You don't have any upcoming events on your schedule. Explore upcoming Great Ife symposiums, concerts, and hackathons."
              : activeTab === "past"
              ? "You haven't attended or registered for any past campus events on NOTARI 2.0."
              : "You haven't registered for any campus events yet. Explore upcoming Great Ife events to reserve passes."
          }
          action={
            searchQuery
              ? { label: "Clear Search", onClick: () => setSearchQuery("") }
              : { label: "Explore Campus Events", href: "/events" }
          }
        />
      )}
    </div>
  );
}
