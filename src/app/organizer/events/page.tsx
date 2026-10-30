import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { PlusCircle, Calendar, MapPin, Eye, Edit } from "lucide-react";

export default function OrganizerEventsListPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            My Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage your submitted, published, and draft university events.
          </p>
        </div>

        <Link href="/organizer/events/create">
          <Button className="rounded-xl px-4 gap-2 bg-purple-600 hover:bg-purple-700 text-xs font-semibold">
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {MOCK_EVENTS.slice(0, 4).map((evt) => (
          <Card
            key={evt.id}
            className="p-5 border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                  {evt.category}
                </span>
                <StatusPill status={evt.status} />
              </div>
              <h3 className="text-base font-bold text-notari-dark">{evt.title}</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{evt.date} • {evt.time}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{evt.venue}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-3 md:pt-0 border-t md:border-0 border-slate-100 justify-between md:justify-end">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Registration</span>
                <span className="text-xs font-bold text-notari-dark">
                  {evt.registered} / {evt.capacity} booked
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/organizer/events/${evt.id}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg gap-1.5">
                    <Edit className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </Button>
                </Link>
                <Link href={`/events/${evt.slug}`}>
                  <Button size="sm" variant="subtle" className="h-8 text-xs rounded-lg gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
