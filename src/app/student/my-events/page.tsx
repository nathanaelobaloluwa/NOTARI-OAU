import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { Calendar, MapPin } from "lucide-react";

export default function StudentMyEventsPage() {
  const registeredEvents = MOCK_EVENTS.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          My Registered Events
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Events you have signed up for or purchased tickets to attend.
        </p>
      </div>

      <div className="space-y-4">
        {registeredEvents.map((evt) => (
          <Card
            key={evt.id}
            className="p-5 border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <Image
                  src={evt.image}
                  alt={evt.title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">{evt.category}</span>
                  <StatusPill status="confirmed" />
                </div>
                <h3 className="text-base font-bold text-notari-dark">{evt.title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
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
            </div>

            <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 w-full sm:w-auto justify-end">
              <Link href="/student/tickets">
                <Button size="sm" className="text-xs rounded-xl font-semibold">
                  View Ticket
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
