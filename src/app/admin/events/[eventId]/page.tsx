import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { ArrowLeft, Calendar, MapPin, Users, Upload, Trash2, Check, X } from "lucide-react";

interface AdminEventDetailProps {
  params: Promise<{ eventId: string }>;
}

export default async function AdminEventDetailPage({ params }: AdminEventDetailProps) {
  const { eventId } = await params;
  const event = MOCK_EVENTS.find((e) => e.id === eventId) || MOCK_EVENTS[0];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Events</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {event.category}
            </span>
            <StatusPill status={event.status} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            {event.title}
          </h1>
          <p className="text-xs text-slate-500">
            Organized by {event.organizer} • {event.date} • {event.venue}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50">
            <Trash2 className="w-4 h-4" />
            <span>Unpublish</span>
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700">
            <Check className="w-4 h-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Details & Flyer Preview */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#101C3A] uppercase tracking-wider">
              Event Flyer
            </h3>
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-100">
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-slate-500">Stored via Cloudinary CDN</p>
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Replace Flyer</span>
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#101C3A] uppercase tracking-wider">
              Event Description & Summary
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
          </Card>
        </div>

        {/* Right Column: Key Stats */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#101C3A] uppercase tracking-wider">
              Capacity & Registration
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Capacity:</span>
                <span className="font-bold text-notari-dark">{event.capacity} seats</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Count:</span>
                <span className="font-bold text-emerald-600">{event.registered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Seats:</span>
                <span className="font-bold text-slate-700">{event.available}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admission:</span>
                <span className="font-bold text-notari-dark">
                  {event.isFree ? "Free" : `₦${event.price.toLocaleString()}`}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#101C3A] uppercase tracking-wider">
              Superadmin Governance
            </h3>
            <p className="text-[11px] text-slate-400">
              Superadmin actions take immediate effect across all public discovery routes and search indexes.
            </p>
            <div className="pt-2">
              <Link href={`/events/${event.slug}`} target="_blank">
                <Button variant="outline" className="w-full text-xs">
                  View Public Live Event
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
