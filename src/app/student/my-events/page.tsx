import React from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Booking } from "@/models";
import { USER_ROLES } from "@/constants/roles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { Calendar, MapPin, Compass, Ticket, Sparkles } from "lucide-react";

export default async function StudentMyEventsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/student/my-events");
  }

  const role = (session.user as { role?: string }).role;
  if (role !== USER_ROLES.STUDENT) {
    if (role === USER_ROLES.ADMIN) {
      redirect("/admin");
    } else if (role === USER_ROLES.ORGANIZER) {
      redirect("/organizer");
    } else {
      redirect("/login");
    }
  }

  await connectToDatabase();

  // Query genuine student bookings from MongoDB
  const bookings = await Booking.find({
    userId: session.user.id,
    paymentStatus: "successful",
  })
    .populate({
      path: "eventId",
      select: "title slug venue category startDate endDate flyerUrl organizerName",
    })
    .sort({ createdAt: -1 })
    .lean();

  // Group by unique event
  const eventsMap = new Map<
    string,
    {
      id: string;
      title: string;
      slug: string;
      venue: string;
      category: string;
      startDate: Date;
      endDate: Date;
      flyerUrl?: string;
      organizerName: string;
      totalPasses: number;
      bookingReferences: string[];
    }
  >();

  for (const b of bookings) {
    const evt = b.eventId as unknown as {
      _id: { toString(): string };
      title: string;
      slug: string;
      venue: string;
      category: string;
      startDate: Date;
      endDate: Date;
      flyerUrl?: string;
      organizerName: string;
    } | null;
    if (!evt || !evt.title) continue;

    const eventId = evt._id.toString();
    const existing = eventsMap.get(eventId);

    if (existing) {
      existing.totalPasses += b.quantity;
      if (!existing.bookingReferences.includes(b.bookingReference)) {
        existing.bookingReferences.push(b.bookingReference);
      }
    } else {
      eventsMap.set(eventId, {
        id: eventId,
        title: evt.title,
        slug: evt.slug,
        venue: evt.venue,
        category: evt.category,
        startDate: new Date(evt.startDate),
        endDate: new Date(evt.endDate),
        flyerUrl: evt.flyerUrl,
        organizerName: evt.organizerName,
        totalPasses: b.quantity,
        bookingReferences: [b.bookingReference],
      });
    }
  }

  const registeredEvents = Array.from(eventsMap.values());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            My Registered Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Events you have signed up for or reserved passes to attend.
          </p>
        </div>

        <Link href="/events">
          <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold rounded-xl w-full sm:w-auto">
            <Compass className="w-4 h-4 text-notari-primary" />
            <span>Discover Events</span>
          </Button>
        </Link>
      </div>

      {/* Events List or Empty State */}
      {registeredEvents.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center bg-white border-slate-200/80 rounded-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-notari-primary mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-notari-dark">No Registered Events</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You haven&apos;t signed up for any events yet. Explore upcoming academic conferences, sports matches, and social gatherings on campus.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/events">
              <Button className="rounded-xl text-xs font-semibold shadow-sm gap-2">
                <Compass className="w-4 h-4" />
                <span>Explore Campus Events</span>
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {registeredEvents.map((evt) => {
            const formattedDate = evt.startDate.toLocaleDateString("en-NG", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const formattedTime = evt.startDate.toLocaleTimeString("en-NG", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            return (
              <Card
                key={evt.id}
                className="p-5 border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {evt.flyerUrl ? (
                      <Image
                        src={evt.flyerUrl}
                        alt={evt.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-800 flex items-center justify-center text-white">
                        <Sparkles className="w-6 h-6 text-indigo-300" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">{evt.category}</span>
                      <StatusPill status="confirmed" />
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-notari-primary border border-indigo-100">
                        {evt.totalPasses} {evt.totalPasses === 1 ? "Pass" : "Passes"}
                      </span>
                    </div>

                    <Link href={`/events/${evt.slug}`} className="block group">
                      <h3 className="text-base font-bold text-notari-dark truncate group-hover:text-notari-primary transition-colors">
                        {evt.title}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 w-full sm:w-auto justify-end shrink-0">
                  <Link href="/student/tickets" className="w-full sm:w-auto">
                    <Button size="sm" className="text-xs rounded-xl font-semibold gap-1.5 w-full sm:w-auto h-10">
                      <Ticket className="w-3.5 h-3.5" />
                      <span>View Ticket Pass</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
