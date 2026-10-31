import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { EVENT_STATUS } from "@/constants/oau";
import { Calendar, MapPin, Search, Compass } from "lucide-react";

interface StudentEventsPageProps {
  searchParams?: Promise<{ search?: string }>;
}

export default async function StudentEventsDiscoveryPage({ searchParams }: StudentEventsPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const searchTerm = resolved.search?.trim();

  await connectToDatabase();

  const query: Record<string, unknown> = {
    status: EVENT_STATUS.PUBLISHED,
  };

  if (searchTerm) {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { title: regex },
      { description: regex },
      { organizerName: regex },
      { venue: regex },
    ];
  }

  const events = await Event.find(query)
    .select("-rejectionReason")
    .sort({ startDate: 1 })
    .limit(18)
    .lean();

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

        <form method="GET" action="/student/events" className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="search"
            defaultValue={searchTerm || ""}
            placeholder="Search events..."
            className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
          />
        </form>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => {
            const startDate = new Date(evt.startDate);
            const formattedDate = startDate.toLocaleDateString("en-NG", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const formattedTime = startDate.toLocaleTimeString("en-NG", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            const lowestPrice = evt.isFree
              ? 0
              : evt.ticketTiers && evt.ticketTiers.length > 0
              ? Math.min(...evt.ticketTiers.map((t) => t.price))
              : 0;

            const priceDisplay = evt.isFree || lowestPrice === 0 ? "Free" : `₦${lowestPrice.toLocaleString()}`;

            return (
              <Card
                key={evt._id.toString()}
                className="overflow-hidden border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-white"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {evt.flyerUrl ? (
                      <Image
                        src={evt.flyerUrl}
                        alt={evt.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-notari-primary font-bold text-xs uppercase">
                        {evt.category}
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="text-xs">
                        {evt.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <p className="text-xs text-slate-400 truncate">{evt.organizerName}</p>
                    <h3 className="text-base font-bold text-notari-dark line-clamp-1">{evt.title}</h3>
                    <div className="space-y-1 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate} • {formattedTime}</span>
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
                    {priceDisplay}
                  </span>
                  <Link href={`/events/${evt.slug}`}>
                    <Button size="sm" variant="subtle" className="text-xs rounded-lg">
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 sm:p-12 border-slate-200/80 bg-white text-center space-y-4 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-notari-primary flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-notari-dark">
              {searchTerm ? "No events found" : "No campus events published yet"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchTerm
                ? "We couldn't find any events matching your search. Try different keywords or browse all categories."
                : "New university workshops, symposia, and concerts will be listed here as soon as they are approved."}
            </p>
          </div>
          {searchTerm && (
            <div className="pt-2">
              <Link href="/student/events">
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                  View All Events
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
