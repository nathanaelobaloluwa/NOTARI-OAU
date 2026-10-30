import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { ArrowLeft, Users, Ticket, DollarSign, Calendar, Edit, QrCode } from "lucide-react";

interface EventManageProps {
  params: Promise<{ eventId: string }>;
}

export default async function OrganizerEventManagePage({ params }: EventManageProps) {
  const { eventId } = await params;
  const event = MOCK_EVENTS.find((e) => e.id === eventId) || MOCK_EVENTS[0];

  return (
    <div className="space-y-6">
      <Link
        href="/organizer/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Events</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
              {event.category}
            </span>
            <StatusPill status={event.status} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            {event.title}
          </h1>
          <p className="text-xs text-slate-500">{event.date} • {event.venue}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/organizer/check-in">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl">
              <QrCode className="w-4 h-4" />
              <span>Launch Check-in Scanner</span>
            </Button>
          </Link>
          <Button size="sm" className="gap-1.5 text-xs rounded-xl bg-purple-600 hover:bg-purple-700">
            <Edit className="w-4 h-4" />
            <span>Edit Event</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200/80 bg-white">
          <p className="text-xs text-slate-400 font-medium">Registered Attendees</p>
          <h3 className="text-xl font-bold text-notari-dark mt-1">{event.registered}</h3>
        </Card>
        <Card className="p-4 border-slate-200/80 bg-white">
          <p className="text-xs text-slate-400 font-medium">Available Seats</p>
          <h3 className="text-xl font-bold text-emerald-600 mt-1">{event.available}</h3>
        </Card>
        <Card className="p-4 border-slate-200/80 bg-white">
          <p className="text-xs text-slate-400 font-medium">Total Hall Capacity</p>
          <h3 className="text-xl font-bold text-notari-dark mt-1">{event.capacity}</h3>
        </Card>
        <Card className="p-4 border-slate-200/80 bg-white">
          <p className="text-xs text-slate-400 font-medium">Gross Revenue</p>
          <h3 className="text-xl font-bold text-indigo-600 mt-1">
            {event.isFree ? "Free" : `₦${(event.registered * event.price).toLocaleString()}`}
          </h3>
        </Card>
      </div>

      {/* Event Details Card */}
      <Card className="p-6 border-slate-200/80 bg-white space-y-4">
        <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
          Event Overview & Public Information
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
      </Card>
    </div>
  );
}
