"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import {
  EVENT_CATEGORIES,
  OAU_FACULTIES,
  formatFacultyLabel,
  EVENT_STATUS,
} from "@/constants/oau";
import { EventFlyerUploader } from "@/components/organizer/EventFlyerUploader";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Edit,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  X,
  Plus,
  Save,
  Globe,
  Mail,
  Phone,
  Info,
  Ban,
  Megaphone,
  Radio,
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

interface EventData {
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
    instructions?: string;
  };
  startDate: string;
  endDate: string;
  salesStartDate?: string;
  salesEndDate?: string;
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
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const OAU_CAMPUS_PRESETS = [
  { label: "Oduduwa Hall", url: "/images/oau/oau-oduduwa-hall.jpg" },
  { label: "Amphitheatre Stage", url: "/images/oau/oau-amphitheatre-stage.jpg" },
  { label: "Senate Building", url: "/images/oau/oau-senate-building.png" },
  { label: "Matriculation Gathering", url: "/images/oau/oau-matriculation-crowd.jpg" },
];

export function OrganizerEventDetailClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals & Action States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editEventType, setEditEventType] = useState<"physical" | "online" | "hybrid">("physical");
  const [editFaculty, setEditFaculty] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editOnlinePlatform, setEditOnlinePlatform] = useState("");
  const [editOnlineMeetingUrl, setEditOnlineMeetingUrl] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editFlyerImage, setEditFlyerImage] = useState("");
  const [editTargetAudience, setEditTargetAudience] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editTiers, setEditTiers] = useState<TicketTier[]>([]);

  // Attendee Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"general" | "venue_change" | "time_change" | "cancellation" | "instructions">("general");
  const [broadcastNewVenue, setBroadcastNewVenue] = useState("");
  const [broadcastNewTime, setBroadcastNewTime] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      setBroadcastError("Please provide both a subject line and announcement message.");
      return;
    }

    setBroadcastLoading(true);
    setBroadcastError(null);

    try {
      const res = await fetch(`/api/organizer/events/${eventId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: broadcastType,
          subjectLine: broadcastSubject.trim(),
          message: broadcastMessage.trim(),
          newVenue: broadcastType === "venue_change" ? broadcastNewVenue.trim() : undefined,
          newTime: broadcastType === "time_change" ? broadcastNewTime.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess("Announcement broadcast successfully dispatched to all registered attendees!");
        setIsBroadcastModalOpen(false);
        setBroadcastSubject("");
        setBroadcastMessage("");
        setBroadcastNewVenue("");
        setBroadcastNewTime("");
      } else {
        setBroadcastError(json.message || "Failed to broadcast announcement.");
      }
    } catch {
      setBroadcastError("Network error while dispatching broadcast notice.");
    } finally {
      setBroadcastLoading(false);
    }
  };
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string[]>>({});

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/organizer/events/${eventId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load event details.");
      }

      setEvent(data.event);
    } catch (err: unknown) {
      console.error("Error fetching event details:", err);
      setError((err as Error).message || "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Pre-fill edit state when opening edit modal
  const openEditModal = () => {
    if (!event) return;
    setEditTitle(event.title || "");
    setEditSummary(event.summary || "");
    setEditDescription(event.description || "");
    setEditCategory(event.category || "");
    setEditEventType(event.eventType || "physical");
    setEditFaculty(event.faculty || "");
    setEditDepartment(event.department || "");
    setEditVenue(event.venue || "");
    setEditOnlinePlatform(event.onlineDetails?.platform || "");
    setEditOnlineMeetingUrl(event.onlineDetails?.meetingUrl || "");
    // Format datetime-local strings
    setEditStartDate(event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "");
    setEditEndDate(event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "");
    setEditFlyerImage(event.flyerImage || event.flyerUrl || "");
    setEditTargetAudience(event.targetAudience || "");
    setEditTags(event.tags ? event.tags.join(", ") : "");
    setEditContactEmail(event.contactEmail || "");
    setEditContactPhone(event.contactPhone || "");
    setEditInstructions(event.instructions || "");
    setEditTiers(
      event.ticketTiers.map((t) => ({
        _id: t._id,
        name: t.name,
        price: t.price,
        capacity: t.capacity,
        available: t.available,
        description: t.description || "",
        maxPerOrder: t.maxPerOrder || 5,
      }))
    );
    setEditFieldErrors({});
    setActionError(null);
    setIsEditModalOpen(true);
  };

  // Submit for Approval action
  const handleSubmitForApproval = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/organizer/events/${eventId}/submit`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit event for approval.");
      }

      setActionSuccess("Event submitted for Superadmin review successfully!");
      setIsSubmitModalOpen(false);
      fetchEvent();
    } catch (err: unknown) {
      setActionError((err as Error).message || "Failed to submit event.");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Event action
  const handleCancelEvent = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/organizer/events/${eventId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to cancel event.");
      }

      setActionSuccess("Event marked as cancelled.");
      setIsCancelModalOpen(false);
      fetchEvent();
    } catch (err: unknown) {
      setActionError((err as Error).message || "Failed to cancel event.");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Draft action
  const handleDeleteDraft = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/organizer/events/${eventId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete event draft.");
      }

      setIsDeleteModalOpen(false);
      router.push("/organizer/events");
    } catch (err: unknown) {
      setActionError((err as Error).message || "Failed to delete draft.");
    } finally {
      setActionLoading(false);
    }
  };

  // Save Edits
  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      setEditFieldErrors({});

      const parsedTags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        description: editDescription.trim(),
        category: editCategory,
        eventType: editEventType,
        faculty: editFaculty || undefined,
        department: editDepartment || undefined,
        venue: editVenue.trim(),
        onlineDetails:
          editEventType !== "physical"
            ? {
                platform: editOnlinePlatform || undefined,
                meetingUrl: editOnlineMeetingUrl || undefined,
              }
            : undefined,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : undefined,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : undefined,
        flyerImage: editFlyerImage || undefined,
        targetAudience: editTargetAudience || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        contactEmail: editContactEmail || undefined,
        contactPhone: editContactPhone || undefined,
        instructions: editInstructions || undefined,
        ticketTiers: editTiers.map((t) => ({
          _id: t._id,
          name: t.name.trim(),
          price: Number(t.price) || 0,
          capacity: Number(t.capacity) || 0,
          description: t.description?.trim() || undefined,
          maxPerOrder: Number(t.maxPerOrder) || 5,
        })),
      };

      const res = await fetch(`/api/organizer/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setEditFieldErrors(data.errors);
        }
        throw new Error(data.message || "Failed to update event.");
      }

      setActionSuccess("Event updated successfully!");
      setIsEditModalOpen(false);
      fetchEvent();
    } catch (err: unknown) {
      setActionError((err as Error).message || "Failed to update event.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTierChange = (index: number, field: keyof TicketTier, value: string | number) => {
    const updated = [...editTiers];
    updated[index] = { ...updated[index], [field]: value };
    setEditTiers(updated);
  };

  const handleAddTier = () => {
    setEditTiers([
      ...editTiers,
      {
        name: "Regular Admission",
        price: 0,
        capacity: 100,
        available: 100,
        maxPerOrder: 5,
        description: "",
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (editTiers.length <= 1) return;
    setEditTiers(editTiers.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading campus event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Unable to load event</h2>
        <p className="text-sm text-slate-500">{error || "Event not found or access restricted."}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/organizer/events">
            <Button variant="outline" className="gap-1.5 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Events</span>
            </Button>
          </Link>
          <Button onClick={fetchEvent} className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700">
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    );
  }

  const occupancyPercent =
    event.totalCapacity > 0
      ? Math.min(100, Math.round(((event.registeredCount || 0) / event.totalCapacity) * 100))
      : 0;

  const isDraft = event.status === EVENT_STATUS.DRAFT;
  const isPending = event.status === EVENT_STATUS.PENDING_APPROVAL;
  const isRejected = event.status === EVENT_STATUS.REJECTED;
  const isPublished = event.status === EVENT_STATUS.PUBLISHED;
  const isCancelled = event.status === EVENT_STATUS.CANCELLED;
  const canEdit = !isCancelled;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/organizer/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Events</span>
        </Link>
        <span className="text-[11px] font-medium text-slate-400">
          Created: {new Date(event.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* Action Success Alert */}
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

      {/* STATUS BANNERS */}
      {isRejected && (
        <div className="p-4 sm:p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Submission Needs Attention / Rejected</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            <strong>Superadmin Feedback: </strong>
            {event.rejectionReason || "Please adjust your event details and resubmit for review."}
          </p>
          <div className="pt-2 flex items-center gap-2">
            <Button
              size="sm"
              onClick={openEditModal}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 rounded-xl font-semibold shadow-sm"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit & Resubmit Event</span>
            </Button>
          </div>
        </div>
      )}

      {isPending && (
        <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Pending Superadmin Review</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your event has been submitted to the Superadmin approval queue. Once verified against university safety and policy standards, it will automatically appear on the public event feed.
          </p>
          {event.submittedAt && (
            <p className="text-[11px] text-amber-700">
              Submitted on: {new Date(event.submittedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
      )}

      {isPublished && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-900">Live on Great Ife Event Feed</p>
              <p className="text-emerald-700 text-[11px]">
                Students can currently view this event and reserve tickets.
              </p>
            </div>
          </div>
          <Link href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100 bg-white shadow-sm">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Page</span>
            </Button>
          </Link>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl flex items-center gap-2 text-xs text-slate-700">
          <Ban className="w-5 h-5 text-slate-500 shrink-0" />
          <span className="font-semibold">This event has been marked as cancelled. No further ticket sales or registrations are accepted.</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-xs px-2.5 py-0.5">
              {event.category}
            </Badge>
            <StatusPill status={event.status} />
            <Badge variant="outline" className="text-slate-600 text-xs px-2.5 py-0.5">
              {event.eventType === "online" ? "Virtual Online" : event.eventType === "hybrid" ? "Hybrid" : "Physical Venue"}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            {event.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.venue}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date(event.startDate).toLocaleDateString("en-NG", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date(event.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                {new Date(event.endDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Draft Actions */}
          {isDraft && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(true)}
                className="gap-1.5 text-xs rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={openEditModal}
                className="gap-1.5 text-xs rounded-xl"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsSubmitModalOpen(true)}
                className="gap-1.5 text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Approval</span>
              </Button>
            </>
          )}

          {/* Rejected Actions */}
          {isRejected && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(true)}
                className="gap-1.5 text-xs rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>
              <Button
                size="sm"
                onClick={openEditModal}
                className="gap-1.5 text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit & Resubmit</span>
              </Button>
            </>
          )}

          {/* Pending Approval Actions */}
          {isPending && (
            <Button
              size="sm"
              variant="outline"
              onClick={openEditModal}
              className="gap-1.5 text-xs rounded-xl"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Modify Details</span>
            </Button>
          )}

          {/* Published Actions */}
          {isPublished && (
            <>
              <Button
                size="sm"
                onClick={() => setIsBroadcastModalOpen(true)}
                className="gap-1.5 text-xs rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-xs"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Broadcast Notice</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCancelModalOpen(true)}
                className="gap-1.5 text-xs rounded-xl text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Event</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={openEditModal}
                className="gap-1.5 text-xs rounded-xl"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-slate-200/80 bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Registered</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-notari-dark">
            {event.registeredCount || 0}
          </div>
          <p className="text-[10px] text-slate-400">Confirmed Attendees</p>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Remaining</span>
            <Ticket className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {event.availableSeats}
          </div>
          <p className="text-[10px] text-slate-400">Seats Available</p>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Capacity</span>
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-notari-dark">
            {event.totalCapacity}
          </div>
          <p className="text-[10px] text-slate-400">Total Hall Seats</p>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Occupancy</span>
            <div className="text-xs font-bold text-indigo-600">{occupancyPercent}%</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            {event.isFree ? "Free Admission" : "Paid Admission"}
          </p>
        </Card>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Details & Tiers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary & Description */}
          <Card className="p-6 border-slate-200/80 bg-white shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
              Event Overview
            </h2>
            {event.summary && (
              <p className="text-sm font-medium text-slate-800 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                &ldquo;{event.summary}&rdquo;
              </p>
            )}
            <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {event.description}
            </div>

            {/* Target Audience & Tags */}
            {(event.targetAudience || (event.tags && event.tags.length > 0)) && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                {event.targetAudience && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Target Audience
                    </span>
                    <p className="text-xs text-slate-700 mt-0.5">{event.targetAudience}</p>
                  </div>
                )}
                {event.tags && event.tags.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Event Tags
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {event.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Ticket Tiers Breakdown */}
          <Card className="p-6 border-slate-200/80 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
                  Ticket Tiers & Capacity Breakdown
                </h2>
                <p className="text-xs text-slate-500">
                  Configured admission types and seat allocations for this event.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {event.ticketTiers.length} {event.ticketTiers.length === 1 ? "Tier" : "Tiers"}
              </Badge>
            </div>

            <div className="space-y-3">
              {event.ticketTiers.map((tier, idx) => (
                <div
                  key={tier._id || idx}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{tier.name}</span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          tier.price === 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-100 text-indigo-700"
                        )}
                      >
                        {tier.price === 0 ? "Free Admission" : `₦${tier.price.toLocaleString()}`}
                      </span>
                    </div>
                    {tier.description && (
                      <p className="text-[11px] text-slate-500">{tier.description}</p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Limit: max {tier.maxPerOrder} tickets per order
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                    <span className="text-xs font-semibold text-slate-700">
                      {tier.capacity} Seats Total
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      {tier.available} Available
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Phase Note */}
            {!event.isFree && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Payment Notice: </strong>
                  Paid ticket tier pricing is recorded. Direct Paystack payment gateway checkout will be integrated in the upcoming payments phase.
                </p>
              </div>
            )}
          </Card>

          {/* Attendee Instructions & Contact */}
          {(event.instructions || event.contactEmail || event.contactPhone) && (
            <Card className="p-6 border-slate-200/80 bg-white shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
                Attendee Guidance & Organizer Support
              </h2>
              {event.instructions && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Instructions for Ticket Holders
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {event.instructions}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {event.contactEmail && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{event.contactEmail}</span>
                  </div>
                )}
                {event.contactPhone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{event.contactPhone}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col): Flyer & Location Details */}
        <div className="space-y-6">
          {/* Publicity Flyer */}
          <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-notari-dark uppercase tracking-wider">
                Event Publicity Flyer
              </h2>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEditModal}
                  className="h-7 text-xs font-semibold text-[#4169E1] hover:text-[#4169E1] hover:bg-[#4169E1]/5 border-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Update Flyer
                </Button>
              )}
            </div>
            <div className="relative aspect-[16/10] bg-slate-100 w-full overflow-hidden">
              {event.flyerImage || event.flyerUrl ? (
                <Image
                  src={event.flyerImage || event.flyerUrl || ""}
                  alt={event.title}
                  fill
                  className="object-cover"
                  unoptimized={(event.flyerImage || event.flyerUrl || "").startsWith("http")}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center">
                  <MapPin className="w-6 h-6" />
                  <span className="text-xs font-medium">No flyer selected</span>
                </div>
              )}
            </div>
          </Card>

          {/* Location & Schedule Card */}
          <Card className="p-5 border-slate-200/80 bg-white shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-notari-dark uppercase tracking-wider">
              Venue & Access
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Campus Location
                </span>
                <p className="font-semibold text-slate-800 mt-0.5">{event.venue}</p>
                {event.faculty && (
                  <p className="text-[11px] text-slate-500">
                    {event.faculty} {event.department ? `• ${event.department}` : ""}
                  </p>
                )}
              </div>

              {event.eventType !== "physical" && event.onlineDetails && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                    <Globe className="w-3.5 h-3.5 text-purple-600" />
                    <span>Online Broadcast</span>
                  </div>
                  {event.onlineDetails.platform && (
                    <p className="text-[11px] text-purple-700">Platform: {event.onlineDetails.platform}</p>
                  )}
                  {event.onlineDetails.meetingUrl && (
                    <a
                      href={event.onlineDetails.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-purple-600 hover:underline break-all block"
                    >
                      {event.onlineDetails.meetingUrl}
                    </a>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Organizer Identity
                </span>
                <p className="font-semibold text-slate-800 mt-0.5">{event.organizerName}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* SUBMIT FOR APPROVAL MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-base">
              <Send className="w-5 h-5 text-purple-600" />
              <span>Submit for Superadmin Review</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Once submitted, your event will enter the pending review queue. Superadmins will verify campus safety and faculty guidelines before publishing.
            </p>
            {actionError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {actionError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitForApproval}
                disabled={actionLoading}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {actionLoading ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL EVENT MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
              <Ban className="w-5 h-5 text-amber-600" />
              <span>Cancel Event</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this event? Existing ticket holders will retain their history, but new registrations will be permanently halted.
            </p>
            {actionError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {actionError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Go Back
              </Button>
              <Button
                size="sm"
                onClick={handleCancelEvent}
                disabled={actionLoading}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DRAFT MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Delete Event Draft</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action cannot be undone. Are you sure you want to permanently delete this draft event?
            </p>
            {actionError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {actionError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteDraft}
                disabled={actionLoading}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {actionLoading ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-notari-dark">Edit Campus Event</h2>
                <p className="text-xs text-slate-500">
                  Update event details, location, and ticket configuration.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSaveEdits} className="space-y-5">
              {/* Basic Fields */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Event Title *</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. OAU Tech Expo 2026"
                  required
                />
                {editFieldErrors.title && (
                  <p className="text-[11px] text-rose-600">{editFieldErrors.title[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Short Summary</label>
                <Input
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Brief one-sentence pitch"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Full Description *</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  required
                />
                {editFieldErrors.description && (
                  <p className="text-[11px] text-rose-600">{editFieldErrors.description[0]}</p>
                )}
              </div>

              {/* Category & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Category *</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    required
                  >
                    <option value="">Select Category</option>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Event Mode *</label>
                  <select
                    value={editEventType}
                    onChange={(e) => setEditEventType(e.target.value as "physical" | "online" | "hybrid")}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  >
                    <option value="physical">Physical On-Campus</option>
                    <option value="online">Virtual / Online</option>
                    <option value="hybrid">Hybrid (Physical & Virtual)</option>
                  </select>
                </div>
              </div>

              {/* Venue & Faculty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Venue *</label>
                  <Input
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    placeholder="e.g. Oduduwa Hall or Amphitheatre"
                    required
                  />
                  {editFieldErrors.venue && (
                    <p className="text-[11px] text-rose-600">{editFieldErrors.venue[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Faculty (Optional)</label>
                  <select
                    value={editFaculty}
                    onChange={(e) => setEditFaculty(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  >
                    <option value="">Campus-Wide / None</option>
                    {OAU_FACULTIES.map((f) => (
                      <option key={f} value={f}>
                        {formatFacultyLabel(f)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Start Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                  />
                  {editFieldErrors.startDate && (
                    <p className="text-[11px] text-rose-600">{editFieldErrors.startDate[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">End Date & Time *</label>
                  <Input
                    type="datetime-local"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    required
                  />
                  {editFieldErrors.endDate && (
                    <p className="text-[11px] text-rose-600">{editFieldErrors.endDate[0]}</p>
                  )}
                </div>
              </div>

              {/* Flyer Presets & Direct Upload */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Event Publicity Flyer</label>
                <EventFlyerUploader
                  value={editFlyerImage}
                  onChange={setEditFlyerImage}
                  presets={OAU_CAMPUS_PRESETS}
                />
              </div>

              {/* Ticket Tiers Editor */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Ticket Tiers
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTier}
                    className="text-xs gap-1 rounded-lg h-7"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tier</span>
                  </Button>
                </div>

                {editTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Tier #{idx + 1}</span>
                      {editTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Tier Name</label>
                        <Input
                          value={tier.name}
                          onChange={(e) => handleTierChange(idx, "name", e.target.value)}
                          placeholder="e.g. Free Regular"
                          className="text-xs h-8"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Price (₦)</label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.price}
                          onChange={(e) => handleTierChange(idx, "price", Number(e.target.value))}
                          className="text-xs h-8"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500">Capacity</label>
                        <Input
                          type="number"
                          min="1"
                          value={tier.capacity}
                          onChange={(e) => handleTierChange(idx, "capacity", Number(e.target.value))}
                          className="text-xs h-8"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{actionLoading ? "Saving..." : "Save Changes"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ATTENDEE BROADCAST MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-[#101C3A]">Broadcast Notice to Attendees</h3>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Send an urgent notice, venue adjustment, schedule change, or preparation instruction directly to all confirmed attendees of <strong>{event?.title}</strong>.
            </p>

            {broadcastError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {broadcastError}
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Type *</label>
                <select
                  value={broadcastType}
                  onChange={(e) =>
                    setBroadcastType(
                      e.target.value as
                        | "general"
                        | "venue_change"
                        | "time_change"
                        | "cancellation"
                        | "instructions"
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                >
                  <option value="general">General Notice / Announcement</option>
                  <option value="venue_change">Venue Change / Relocation</option>
                  <option value="time_change">Schedule / Time Adjustment</option>
                  <option value="instructions">Entry & Arrival Instructions</option>
                  <option value="cancellation">Emergency Event Cancellation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Venue Moved to Oduduwa Hall Main Auditorium"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>

              {broadcastType === "venue_change" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Venue Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oduduwa Hall, OAU Campus"
                    value={broadcastNewVenue}
                    onChange={(e) => setBroadcastNewVenue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>
              )}

              {broadcastType === "time_change" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Date & Time Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saturday, Nov 15 at 2:00 PM (WAT)"
                    value={broadcastNewTime}
                    onChange={(e) => setBroadcastNewTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message to Attendees *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide complete information and guidance for attendees..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-[11px] flex items-start gap-2">
                <Radio className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  This broadcast will automatically deliver in-app notifications and branded emails to all registered ticket holders.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  disabled={broadcastLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={broadcastLoading}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{broadcastLoading ? "Dispatching..." : "Send Broadcast"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

