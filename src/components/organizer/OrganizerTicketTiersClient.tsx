"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Ticket,
  PlusCircle,
  Calendar,
  DollarSign,
  Users,
  Trash2,
  Edit,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketTier {
  _id?: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
  description?: string;
  maxPerOrder?: number;
}

interface OrganizerEvent {
  _id: string;
  title: string;
  isFree: boolean;
  status: string;
  startDate: string;
  ticketTiers: TicketTier[];
}

export function OrganizerTicketTiersClient() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Add Tier Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [targetEventId, setTargetEventId] = useState<string>("");
  const [newTierName, setNewTierName] = useState("");
  const [newTierPrice, setNewTierPrice] = useState<number>(0);
  const [newTierCapacity, setNewTierCapacity] = useState<number>(100);
  const [newTierMaxPerOrder, setNewTierMaxPerOrder] = useState<number>(5);
  const [newTierDesc, setNewTierDesc] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizer/events?limit=50");
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
        if (data.events.length > 0 && !targetEventId) {
          setTargetEventId(data.events[0]._id);
        }
      } else {
        setError(data.message || "Failed to load events.");
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Network error: Could not fetch events.");
    } finally {
      setLoading(false);
    }
  }, [targetEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Flatten and filter tiers
  const filteredEvents =
    selectedEventId === "all"
      ? events
      : events.filter((e) => e._id === selectedEventId);

  interface FlatTier extends TicketTier {
    eventId: string;
    eventTitle: string;
    eventStatus: string;
    isEventFree: boolean;
    sold: number;
  }

  const allTiers: FlatTier[] = [];
  for (const evt of filteredEvents) {
    if (Array.isArray(evt.ticketTiers)) {
      for (const tier of evt.ticketTiers) {
        const sold = Math.max(0, tier.capacity - (tier.available ?? tier.capacity));
        allTiers.push({
          ...tier,
          eventId: evt._id,
          eventTitle: evt.title,
          eventStatus: evt.status,
          isEventFree: evt.isFree,
          sold,
        });
      }
    }
  }

  // Aggregate Metrics
  const totalTiersCount = allTiers.length;
  const totalCapacity = allTiers.reduce((acc, t) => acc + (t.capacity || 0), 0);
  const totalSold = allTiers.reduce((acc, t) => acc + (t.sold || 0), 0);
  const totalGrossValue = allTiers.reduce((acc, t) => acc + (t.capacity || 0) * (t.price || 0), 0);

  // Handle Add Tier Submit
  const handleAddTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEventId) {
      setModalError("Please select an event.");
      return;
    }
    if (!newTierName.trim()) {
      setModalError("Tier name is required.");
      return;
    }
    if (newTierCapacity <= 0) {
      setModalError("Capacity must be at least 1.");
      return;
    }

    const eventToUpdate = events.find((e) => e._id === targetEventId);
    if (!eventToUpdate) {
      setModalError("Selected event not found.");
      return;
    }

    if (eventToUpdate.isFree && newTierPrice > 0) {
      setModalError("This is a free event; ticket tiers must have a price of ₦0.");
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      const updatedTiers = [
        ...eventToUpdate.ticketTiers.map((t) => ({
          _id: t._id,
          name: t.name,
          price: t.price,
          capacity: t.capacity,
          description: t.description || "",
          maxPerOrder: t.maxPerOrder || 5,
        })),
        {
          name: newTierName.trim(),
          price: eventToUpdate.isFree ? 0 : Number(newTierPrice) || 0,
          capacity: Number(newTierCapacity) || 50,
          description: newTierDesc.trim(),
          maxPerOrder: Number(newTierMaxPerOrder) || 5,
        },
      ];

      const res = await fetch(`/api/organizer/events/${targetEventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTiers: updatedTiers }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Ticket tier "${newTierName.trim()}" added to "${eventToUpdate.title}"!`);
        setIsModalOpen(false);
        setNewTierName("");
        setNewTierPrice(0);
        setNewTierCapacity(100);
        setNewTierDesc("");
        fetchEvents();
      } else {
        setModalError(data.message || "Failed to add ticket tier.");
      }
    } catch (err) {
      console.error("Add tier error:", err);
      setModalError("Network error occurred while adding ticket tier.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Tier
  const handleDeleteTier = async (tier: FlatTier) => {
    if (tier.sold > 0) {
      alert(`Cannot delete "${tier.name}": ${tier.sold} tickets have already been registered.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${tier.name}" ticket tier?`)) {
      return;
    }

    const eventToUpdate = events.find((e) => e._id === tier.eventId);
    if (!eventToUpdate) return;

    if (eventToUpdate.ticketTiers.length <= 1) {
      alert("An event must have at least one ticket tier. You cannot delete the only tier.");
      return;
    }

    try {
      const remainingTiers = eventToUpdate.ticketTiers
        .filter((t) => t._id !== tier._id)
        .map((t) => ({
          _id: t._id,
          name: t.name,
          price: t.price,
          capacity: t.capacity,
          description: t.description || "",
          maxPerOrder: t.maxPerOrder || 5,
        }));

      const res = await fetch(`/api/organizer/events/${tier.eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTiers: remainingTiers }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Ticket tier "${tier.name}" removed successfully.`);
        fetchEvents();
      } else {
        alert(data.message || "Failed to delete ticket tier.");
      }
    } catch {
      alert("Failed to delete ticket tier. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Ticket Tiers & Pricing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure admission categories, price levels, and ticket limits across your campus events.
          </p>
        </div>

        <Button
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
          disabled={events.length === 0}
          className="rounded-xl px-4 gap-2 bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white cursor-pointer shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Ticket Tier</span>
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Active Tiers</p>
              <p className="text-xl sm:text-2xl font-bold text-notari-dark mt-0.5">{totalTiersCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Total Capacity</p>
              <p className="text-xl sm:text-2xl font-bold text-notari-dark mt-0.5">{totalCapacity}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-emerald-600 font-medium">Sold / Reserved</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">{totalSold}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Inventory Value</p>
              <p className="text-xl sm:text-2xl font-bold text-notari-dark mt-0.5">
                ₦{totalGrossValue.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter by Event */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Filter Event:</span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">All Events ({events.length})</option>
            {events.map((evt) => (
              <option key={evt._id} value={evt._id}>
                {evt.title} ({evt.ticketTiers?.length || 0} tiers)
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          disabled={loading}
          className="h-8 rounded-lg text-xs gap-1 border-slate-200 text-slate-600"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Tiers List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span>Loading ticket tiers...</span>
        </div>
      ) : allTiers.length === 0 ? (
        <Card className="p-12 text-center bg-white border-slate-200/80 space-y-3">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-notari-dark">No ticket tiers found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {events.length === 0
              ? "You haven't created any campus events yet. Create an event to configure ticket tiers."
              : "No ticket tiers found for the selected event."}
          </p>
          {events.length === 0 ? (
            <Link href="/organizer/events/create">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs mt-2">
                Create Campus Event
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs mt-2"
            >
              Add First Tier
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allTiers.map((tier, idx) => (
            <Card
              key={tier._id || idx}
              className="p-5 border-slate-200/80 bg-white shadow-xs space-y-4 hover:border-purple-200 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-notari-dark">{tier.name}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate max-w-[220px]">
                      {tier.eventTitle}
                    </p>
                    {tier.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tier.description}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-notari-dark block">
                    {tier.price === 0 ? "Free" : `₦${tier.price.toLocaleString()}`}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold inline-block mt-0.5",
                      tier.available === 0
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    )}
                  >
                    {tier.available === 0 ? "Sold Out" : `${tier.available} Available`}
                  </span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Reserved: {tier.sold} passes</span>
                  <span>Capacity: {tier.capacity}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((tier.sold / Math.max(tier.capacity, 1)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Max {tier.maxPerOrder || 5} per order
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/organizer/events/${tier.eventId}`}
                    className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <span>Manage on Event</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  {tier.sold === 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTier(tier)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete ticket tier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Ticket Tier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-notari-dark">Add New Ticket Tier</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddTierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Event</label>
                <select
                  value={targetEventId}
                  onChange={(e) => {
                    setTargetEventId(e.target.value);
                    const selected = events.find((ev) => ev._id === e.target.value);
                    if (selected?.isFree) setNewTierPrice(0);
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  {events.map((evt) => (
                    <option key={evt._id} value={evt._id}>
                      {evt.title} ({evt.isFree ? "Free Event" : "Paid Event"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tier Name</label>
                <Input
                  type="text"
                  value={newTierName}
                  onChange={(e) => setNewTierName(e.target.value)}
                  placeholder="e.g. VIP Student Pass, Early Bird Admission"
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (NGN ₦)</label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(Number(e.target.value))}
                    disabled={events.find((e) => e._id === targetEventId)?.isFree}
                    className="h-10 text-xs rounded-xl"
                  />
                  {events.find((e) => e._id === targetEventId)?.isFree && (
                    <p className="text-[10px] text-slate-400 mt-1">Locked at ₦0 for free event</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    value={newTierCapacity}
                    onChange={(e) => setNewTierCapacity(Number(e.target.value))}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Per Order</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={newTierMaxPerOrder}
                  onChange={(e) => setNewTierMaxPerOrder(Number(e.target.value))}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tier Description (Optional)</label>
                <textarea
                  value={newTierDesc}
                  onChange={(e) => setNewTierDesc(e.target.value)}
                  placeholder="Includes backstage access, priority seating, etc."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Ticket Tier"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
