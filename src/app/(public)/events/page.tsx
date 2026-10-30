import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { EVENT_CATEGORIES, OAU_FACULTIES } from "@/constants/oau";
import { Search, Calendar, MapPin, Filter, ArrowRight } from "lucide-react";

export default function EventsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-notari-dark tracking-tight">Explore Campus Events</h1>
        <p className="text-sm text-slate-500">
          Discover all upcoming events, hackathons, lectures, and festivals across Obafemi Awolowo University.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200/80 shadow-sm bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event title..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs text-notari-dark placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
            />
          </div>

          <div>
            <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20">
              <option value="">All Categories</option>
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20">
              <option value="">All Faculties</option>
              {OAU_FACULTIES.map((fac) => (
                <option key={fac} value={fac}>
                  {fac}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20">
              <option value="">Any Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
            <Button size="sm" className="h-10 px-4 rounded-xl text-xs font-semibold">
              Apply
            </Button>
          </div>
        </div>
      </Card>

      {/* Events Listing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_EVENTS.map((evt) => (
          <Card
            key={evt.id}
            className="overflow-hidden border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <Image
                  src={evt.image}
                  alt={evt.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="text-xs shadow">
                    {evt.category}
                  </Badge>
                </div>
                {evt.isFree && (
                  <div className="absolute top-3 right-3">
                    <StatusPill status="free" />
                  </div>
                )}
              </div>

              <div className="p-6 space-y-3">
                <p className="text-xs font-medium text-slate-500">{evt.organizer}</p>
                <h3 className="text-lg font-bold text-notari-dark group-hover:text-notari-primary transition-colors line-clamp-1">
                  {evt.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {evt.description}
                </p>

                <div className="pt-2 space-y-1.5 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{evt.date} • {evt.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{evt.venue}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Admission</span>
                <span className="text-sm font-bold text-notari-dark">
                  {evt.isFree ? "Free" : `₦${evt.price.toLocaleString()}`}
                </span>
              </div>

              <Link href={`/events/${evt.slug}`}>
                <Button size="sm" className="rounded-xl px-4 text-xs font-medium gap-1">
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
