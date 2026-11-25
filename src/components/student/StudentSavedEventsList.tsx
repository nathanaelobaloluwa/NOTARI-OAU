"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { EventFlyerImage } from "@/components/shared/event-flyer-image";
import { NotariEmptyState } from "@/components/shared/notari-empty-state";
import {
  Calendar,
  MapPin,
  Trash2,
  ArrowRight,
  Loader2,
} from "lucide-react";

export interface SavedEventItem {
  id: string; // Bookmark document id
  eventId: string; // Event document id
  title: string;
  slug: string;
  organizerName: string;
  category: string;
  venue: string;
  startDate: string;
  endDate?: string;
  flyerUrl?: string;
  isFree: boolean;
  lowestPrice: number;
}

interface StudentSavedEventsListProps {
  initialBookmarks: SavedEventItem[];
}

export function StudentSavedEventsList({
  initialBookmarks,
}: StudentSavedEventsListProps) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<SavedEventItem[]>(initialBookmarks);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleRemove = async (eventId: string, title: string) => {
    if (removingId) return;

    setRemovingId(eventId);
    const previousBookmarks = [...bookmarks];
    // Optimistic removal
    setBookmarks((prev) => prev.filter((b) => b.eventId !== eventId));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/bookmarks?eventId=${eventId}`, {
          method: "DELETE",
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          // Revert optimistic removal
          setBookmarks(previousBookmarks);
          alert(data.message || `Failed to remove "${title}" from bookmarks.`);
        } else {
          router.refresh();
        }
      } catch (err) {
        setBookmarks(previousBookmarks);
        console.error("❌ Failed to remove bookmark:", err);
        alert(`Network error while removing "${title}" from bookmarks.`);
      } finally {
        setRemovingId(null);
      }
    });
  };

  if (bookmarks.length === 0) {
    return (
      <NotariEmptyState
        variant="bookmarks"
        title="No Saved Events Yet"
        description="You haven't bookmarked any campus events yet. Explore upcoming Great Ife symposiums, hackathons, concerts, and workshops to save events you want to attend."
        action={{
          label: "Explore Campus Events",
          href: "/events",
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Counter bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          You have <strong className="text-notari-dark">{bookmarks.length}</strong>{" "}
          {bookmarks.length === 1 ? "saved event" : "saved events"}
        </span>
        <span className="text-purple-600 font-medium">Ready to reserve</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookmarks.map((item) => {
          const startDate = new Date(item.startDate);
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

          const priceDisplay =
            item.isFree || item.lowestPrice === 0
              ? "Free"
              : `₦${item.lowestPrice.toLocaleString()}`;

          const isCurrentlyRemoving = removingId === item.eventId;

          return (
            <Card
              key={item.id}
              className="overflow-hidden border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-white group"
            >
              <div>
                {/* Event Flyer / Fallback */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <EventFlyerImage
                    src={item.flyerUrl}
                    alt={item.title}
                    title={item.title}
                    category={item.category}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                    <Badge variant="secondary" className="text-[11px] shadow-sm font-semibold">
                      {item.category}
                    </Badge>
                    {item.isFree && <StatusPill status="free" />}
                  </div>

                  {/* Quick Remove Action Button */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.eventId, item.title)}
                      disabled={isCurrentlyRemoving}
                      className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-500 hover:text-rose-600 shadow-md backdrop-blur-md flex items-center justify-center transition-all border border-white/60 touch-manipulation"
                      aria-label={`Remove ${item.title} from bookmarks`}
                      title="Remove from saved events"
                    >
                      {isCurrentlyRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 truncate">
                    {item.organizerName}
                  </p>
                  <Link href={`/events/${item.slug}`}>
                    <h3 className="text-base sm:text-lg font-bold text-notari-dark group-hover:text-notari-primary transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                  </Link>

                  <div className="pt-1 space-y-1.5 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-notari-primary shrink-0" />
                      <span>
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-notari-primary shrink-0" />
                      <span className="truncate">{item.venue}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Admission</span>
                  <span className="text-sm font-extrabold text-notari-dark">{priceDisplay}</span>
                </div>

                <Link href={`/events/${item.slug}`}>
                  <Button size="sm" className="rounded-xl px-4 text-xs font-semibold gap-1.5 shadow-sm">
                    <span>Reserve Pass</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
