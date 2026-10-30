import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { Calendar, MapPin, Search } from "lucide-react";

export default function StudentEventsDiscoveryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Discover Campus Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Find workshops, conferences, and student gatherings to attend this semester.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search events..."
            className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_EVENTS.map((evt) => (
          <Card
            key={evt.id}
            className="overflow-hidden border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-[16/10] bg-slate-100">
                <Image
                  src={evt.image}
                  alt={evt.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="text-xs">
                    {evt.category}
                  </Badge>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <p className="text-xs text-slate-400">{evt.organizer}</p>
                <h3 className="text-base font-bold text-notari-dark line-clamp-1">{evt.title}</h3>
                <div className="space-y-1 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{evt.date} • {evt.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{evt.venue}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-notari-dark">
                {evt.isFree ? "Free" : `₦${evt.price.toLocaleString()}`}
              </span>
              <Link href={`/events/${evt.slug}`}>
                <Button size="sm" variant="subtle" className="text-xs rounded-lg">
                  View Pass
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
