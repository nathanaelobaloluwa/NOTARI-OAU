"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NotariEmptyState } from "@/components/shared/notari-empty-state";
import {
  Users,
  CheckCircle2,
  Clock,
  Percent,
  Search,
  Download,
  QrCode,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Attendee {
  id: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  matricNumber: string | null;
  tierName: string;
  pricePaid: number;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  eventId: string;
  eventTitle: string;
  registeredAt: string;
}

interface EventOption {
  id: string;
  title: string;
  status: string;
}

interface Stats {
  totalAttendees: number;
  checkedInCount: number;
  notCheckedInCount: number;
  checkInPercentage: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function OrganizerAttendeesClient() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalAttendees: 0,
    checkedInCount: 0,
    notCheckedInCount: 0,
    checkInPercentage: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendees = useCallback(
    async (page = 1, eventId = selectedEventId, status = statusFilter, search = searchQuery) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "25");
        if (eventId !== "all") params.set("eventId", eventId);
        if (status !== "all") params.set("status", status);
        if (search.trim().length > 0) params.set("search", search.trim());

        const res = await fetch(`/api/organizer/attendees?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setAttendees(data.attendees || []);
          if (data.events) setEvents(data.events);
          if (data.stats) setStats(data.stats);
          if (data.pagination) setPagination(data.pagination);
        } else {
          setError(data.message || "Failed to load attendees.");
        }
      } catch (err) {
        console.error("Fetch attendees error:", err);
        setError("Network error: Could not fetch attendee list.");
      } finally {
        setLoading(false);
      }
    },
    [selectedEventId, statusFilter, searchQuery]
  );

  useEffect(() => {
    fetchAttendees(1, selectedEventId, statusFilter, searchQuery);
  }, [fetchAttendees, selectedEventId, statusFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (attendees.length === 0) return;

    const headers = [
      "Ticket Code",
      "Attendee Name",
      "Matric Number",
      "University Email",
      "Event Title",
      "Ticket Tier",
      "Price Paid (NGN)",
      "Check-in Status",
      "Checked In At",
      "Registration Date",
    ];

    const rows = attendees.map((a) => [
      `"${a.ticketCode}"`,
      `"${a.attendeeName.replace(/"/g, '""')}"`,
      `"${a.matricNumber || "N/A"}"`,
      `"${a.attendeeEmail}"`,
      `"${a.eventTitle.replace(/"/g, '""')}"`,
      `"${a.tierName.replace(/"/g, '""')}"`,
      a.pricePaid,
      a.isCheckedIn ? "Checked In" : "Not Arrived",
      a.checkedInAt ? `"${new Date(a.checkedInAt).toLocaleString()}"` : "N/A",
      `"${new Date(a.registeredAt).toLocaleString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `notari-attendees-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Event Attendees
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor registered students, university matriculation details, and door check-in status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={attendees.length === 0}
            className="rounded-xl h-9 px-3.5 text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Link href="/organizer/check-in">
            <Button
              size="sm"
              className="rounded-xl h-9 px-4 gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Launch QR Scanner</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Total Attendees</p>
              <p className="text-xl sm:text-2xl font-bold text-notari-dark mt-0.5">{stats.totalAttendees}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-emerald-600 font-medium">Checked In</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">{stats.checkedInCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-amber-600 font-medium">Not Arrived</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-0.5">{stats.notCheckedInCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-indigo-600 font-medium">Gate Arrival Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-700 mt-0.5">{stats.checkInPercentage}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 border-slate-200/80 bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, matric no, ticket code..."
              className="pl-9 text-xs h-9 rounded-xl border-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Event Selector */}
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="all">All Campus Events</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>

            {/* Check-in Status Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  statusFilter === "all" ? "bg-white text-notari-dark shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("checked_in")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  statusFilter === "checked_in" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Checked In
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("not_checked_in")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                  statusFilter === "not_checked_in" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Not Arrived
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Attendees Table */}
      <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <span>Loading attendee records...</span>
          </div>
        ) : error ? (
          <NotariEmptyState
            variant="generic"
            isError={true}
            title="Failed to Load Attendees"
            description={error}
            onRetry={() => fetchAttendees(pagination.page)}
            className="border-0 shadow-none py-12"
          />
        ) : attendees.length === 0 ? (
          <NotariEmptyState
            variant={searchQuery ? "search" : "attendees"}
            title={searchQuery ? "No Matching Attendees" : "No Registered Attendees Yet"}
            description={
              searchQuery
                ? `No attendee records match "${searchQuery}". Try searching by a different name or matriculation number.`
                : "No student tickets have been registered for the selected filter."
            }
            action={searchQuery ? { label: "Clear Search", onClick: () => setSearchQuery("") } : undefined}
            className="border-0 shadow-none py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Attendee Name</th>
                  <th className="py-3 px-4">Matric No.</th>
                  <th className="py-3 px-4">University Email</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Ticket Type</th>
                  <th className="py-3 px-4">Gate Status</th>
                  <th className="py-3 px-4 text-right">Ticket Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendees.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-notari-dark">{a.attendeeName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{a.matricNumber || "—"}</td>
                    <td className="py-3.5 px-4 text-slate-600">{a.attendeeEmail}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[180px] truncate">
                      {a.eventTitle}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{a.tierName}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={a.isCheckedIn ? "success" : "outline"}
                        className={cn(
                          "text-[10px] font-semibold",
                          a.isCheckedIn ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "text-slate-500"
                        )}
                      >
                        {a.isCheckedIn ? "Checked In" : "Not Arrived"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-600">
                      {a.ticketCode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {attendees.length} of {pagination.total} registered attendees
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchAttendees(pagination.page - 1)}
                className="h-8 rounded-lg px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="font-semibold text-notari-dark">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchAttendees(pagination.page + 1)}
                className="h-8 rounded-lg px-2 text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
