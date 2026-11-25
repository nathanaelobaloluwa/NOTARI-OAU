"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { EVENT_STATUS } from "@/constants/oau";
import { NotariEmptyState } from "@/components/shared/notari-empty-state";
import {
  Check,
  X,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Ticket,
  User,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketTier {
  _id?: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
  description?: string;
  maxPerOrder: number;
}

interface AdminEvent {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  description: string;
  category: string;
  eventType?: "physical" | "online" | "hybrid";
  faculty?: string;
  department?: string;
  venue: string;
  onlineDetails?: {
    platform?: string;
    meetingUrl?: string;
  };
  startDate: string;
  endDate: string;
  flyerImage?: string;
  flyerUrl?: string;
  targetAudience?: string;
  tags?: string[];
  contactEmail?: string;
  contactPhone?: string;
  instructions?: string;
  ticketTiers: TicketTier[];
  totalCapacity: number;
  availableSeats: number;
  registeredCount: number;
  status: string;
  rejectionReason?: string;
  isFree: boolean;
  organizerName: string;
  organizerId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    isOrganizer?: boolean;
    matricNumber?: string;
  };
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

interface Metrics {
  pending: number;
  published: number;
  rejected: number;
  draft: number;
  cancelled: number;
  total: number;
}

export function AdminEventApprovalsClient() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    pending: 0,
    published: 0,
    rejected: 0,
    draft: 0,
    cancelled: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending_approval");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review Modals
  const [reviewModal, setReviewModal] = useState<{
    event: AdminEvent;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/events/approvals?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setEvents(data.events || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error("Failed to load admin events queue:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    setActionError(null);
    setActionLoading(true);

    try {
      if (reviewModal.action === "reject" && (!rejectReason.trim() || rejectReason.trim().length < 5)) {
        throw new Error("Please provide a constructive rejection reason (at least 5 characters) for the organizer.");
      }

      const res = await fetch(`/api/admin/events/${reviewModal.event._id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewModal.action,
          reason: reviewModal.action === "reject" ? rejectReason.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to process event review.");
      }

      setActionSuccess(data.message || `Event marked as ${reviewModal.action}d.`);
      setReviewModal(null);
      setRejectReason("");
      fetchEvents();
    } catch (err: unknown) {
      setActionError((err as Error).message || "An error occurred during review.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card
          onClick={() => setStatusFilter("pending_approval")}
          className={cn(
            "p-4 cursor-pointer transition-all border",
            statusFilter === "pending_approval"
              ? "border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{metrics.pending}</div>
          <p className="text-[10px] text-slate-400">Awaiting your approval</p>
        </Card>

        <Card
          onClick={() => setStatusFilter("published")}
          className={cn(
            "p-4 cursor-pointer transition-all border",
            statusFilter === "published"
              ? "border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Published</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{metrics.published}</div>
          <p className="text-[10px] text-slate-400">Live on campus feed</p>
        </Card>

        <Card
          onClick={() => setStatusFilter("rejected")}
          className={cn(
            "p-4 cursor-pointer transition-all border",
            statusFilter === "rejected"
              ? "border-rose-400 bg-rose-50/50 ring-2 ring-rose-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
            <X className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{metrics.rejected}</div>
          <p className="text-[10px] text-slate-400">Requires organizer fixes</p>
        </Card>

        <Card
          onClick={() => setStatusFilter("all")}
          className={cn(
            "p-4 cursor-pointer transition-all border",
            statusFilter === "all"
              ? "border-purple-400 bg-purple-50/50 ring-2 ring-purple-400/20"
              : "border-slate-200/80 bg-white hover:border-slate-300"
          )}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Submissions</span>
            <Ticket className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-notari-dark mt-1">{metrics.total}</div>
          <p className="text-[10px] text-slate-400">All registered events</p>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "pending_approval", label: "Pending Review" },
            { id: "published", label: "Published" },
            { id: "rejected", label: "Rejected" },
            { id: "all", label: "All Events" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                statusFilter === tab.id
                  ? "bg-notari-dark text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, venue, organizer..."
              className="pl-9 text-xs h-9 rounded-xl bg-white"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchEvents}
            disabled={loading}
            className="h-9 px-3 rounded-xl text-xs gap-1"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* EVENT LIST */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Fetching event submissions...</p>
        </div>
      ) : events.length === 0 ? (
        <NotariEmptyState
          variant={searchQuery ? "search" : "events"}
          title={statusFilter === "pending_approval" ? "No Events in Approval Queue" : "No Events Found"}
          description={
            statusFilter === "pending_approval"
              ? "All submitted organizer events have been reviewed. New submissions will appear here automatically."
              : "No event submissions match your search or filter criteria. Try clearing search filters."
          }
          action={searchQuery ? { label: "Clear Search", onClick: () => setSearchQuery("") } : undefined}
        />
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const isExpanded = expandedId === event._id;
            const isPending = event.status === EVENT_STATUS.PENDING_APPROVAL;
            const isRejected = event.status === EVENT_STATUS.REJECTED;
            const isPublished = event.status === EVENT_STATUS.PUBLISHED;

            return (
              <Card
                key={event._id}
                className={cn(
                  "border bg-white shadow-sm overflow-hidden transition-all",
                  isPending ? "border-amber-200/80" : "border-slate-200/80"
                )}
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">
                        {event.category}
                      </Badge>
                      <StatusPill status={event.status} />
                      <span className="text-[10px] text-slate-400 font-medium">
                        Capacity: {event.totalCapacity} seats
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-notari-dark truncate">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{event.organizerName}</span>
                        {event.organizerId?.email && (
                          <span className="text-slate-400">({event.organizerId.email})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(event.startDate).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Expand Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setReviewModal({ event, action: "approve" })}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl font-semibold h-8"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Publish</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectReason("");
                            setReviewModal({ event, action: "reject" });
                          }}
                          className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs gap-1.5 rounded-xl font-semibold h-8"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </Button>
                      </>
                    )}

                    {isPublished && (
                      <Link href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="text-xs gap-1 rounded-xl h-8">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Live</span>
                        </Button>
                      </Link>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(isExpanded ? null : event._id)}
                      className="text-slate-500 hover:text-slate-800 h-8 px-2"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* EXPANDED REVIEW DETAILS */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-5">
                    {/* Rejection Notice if rejected */}
                    {isRejected && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                        <span className="font-bold">Prior Rejection Reason: </span>
                        {event.rejectionReason}
                      </div>
                    )}

                    {/* Description & Summary */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Event Description
                      </span>
                      {event.summary && (
                        <p className="text-xs font-semibold text-slate-800 italic">
                          &ldquo;{event.summary}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                        {event.description}
                      </p>
                    </div>

                    {/* Flyer Preview & Schedule Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(event.flyerUrl || event.flyerImage) && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Flyer Visual
                          </span>
                          <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
                            <Image
                              src={event.flyerUrl || event.flyerImage || ""}
                              alt={event.title}
                              fill
                              className="object-cover"
                              unoptimized={(event.flyerUrl || event.flyerImage || "").startsWith("http")}
                            />
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-2 space-y-2 text-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Schedule & Campus Verification
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Start Time</span>
                            <p className="font-medium text-slate-800">
                              {new Date(event.startDate).toLocaleString("en-NG", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">End Time</span>
                            <p className="font-medium text-slate-800">
                              {new Date(event.endDate).toLocaleString("en-NG", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Venue Mode</span>
                            <p className="font-medium text-slate-800">
                              {event.eventType === "online" ? "Virtual Online" : event.eventType === "hybrid" ? "Hybrid" : "Physical Venue"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Faculty / Dept</span>
                            <p className="font-medium text-slate-800">
                              {event.faculty || "Campus-Wide"} {event.department ? `(${event.department})` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Tiers */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Configured Ticket Tiers ({event.ticketTiers.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {event.ticketTiers.map((tier, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{tier.name}</span>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                  tier.price === 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-indigo-100 text-indigo-800"
                                )}
                              >
                                {tier.price === 0 ? "Free" : `₦${tier.price.toLocaleString()}`}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                              <span>Capacity: {tier.capacity}</span>
                              <span>Max/Order: {tier.maxPerOrder}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* APPROVAL / REJECTION DECISION MODAL */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {reviewModal.action === "approve" ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-notari-dark">
                    {reviewModal.action === "approve" ? "Approve Campus Event" : "Reject Event Submission"}
                  </h3>
                  <p className="text-[11px] text-slate-500">{reviewModal.event.title}</p>
                </div>
              </div>
              <button
                onClick={() => setReviewModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {actionError}
              </div>
            )}

            {reviewModal.action === "approve" ? (
              <p className="text-xs text-slate-600 leading-relaxed">
                Approving this event will immediately set its status to <strong>Published</strong>. It will be discoverable on the public OAU event catalogue, and eligible students can start reserving tickets immediately.
              </p>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Rejection Reason & Organizer Feedback *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this event cannot be approved (e.g. venue scheduling conflict, policy violation, missing details)..."
                  rows={3}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Minimum 5 characters. The organizer will see this feedback and can edit and resubmit.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewModal(null)}
                disabled={actionLoading}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReviewSubmit}
                disabled={actionLoading}
                className={cn(
                  "text-xs rounded-xl text-white font-semibold gap-1.5",
                  reviewModal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {actionLoading ? "Processing..." : reviewModal.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

