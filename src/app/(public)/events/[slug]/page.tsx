import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { Bookmark } from "@/models/Bookmark";
import { EVENT_STATUS } from "@/constants/oau";
import { USER_ROLES } from "@/constants/roles";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { EventBookingCard } from "@/components/events/EventBookingCard";
import { BookmarkButton } from "@/components/events/BookmarkButton";
import { EventFlyerImage } from "@/components/shared/event-flyer-image";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  School,
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  await connectToDatabase();

  // 1. Strict public visibility rule: only approved and published events
  const event = await Event.findOne({
    slug: slug.toLowerCase().trim(),
    status: EVENT_STATUS.PUBLISHED,
  })
    .select("-rejectionReason")
    .lean();

  if (!event) {
    notFound();
  }

  const session = await auth();
  const sessionUser = session?.user
    ? {
        id: session.user.id as string,
        name: session.user.name,
        email: session.user.email,
        role: (session.user as { role?: string }).role,
      }
    : null;

  // Check if current authenticated student has bookmarked this event
  const isStudent = sessionUser?.role === USER_ROLES.STUDENT;
  let isBookmarked = false;
  if (isStudent && sessionUser?.id) {
    const existingBookmark = await Bookmark.exists({
      userId: sessionUser.id,
      eventId: event._id,
    });
    isBookmarked = Boolean(existingBookmark);
  }

  // 2. Date and Time formatting
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);

  const formattedDate = startDate.toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = `${startDate.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} - ${endDate.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;

  // 3. Pricing and Seat Availability
  const ticketTiers = event.ticketTiers || [];
  const serializedTicketTiers = ticketTiers.map((t: {
    _id?: { toString(): string };
    name: string;
    price: number;
    capacity: number;
    available?: number;
    description?: string;
    maxPerOrder?: number;
  }) => ({
    id: t._id ? t._id.toString() : "",
    name: t.name,
    price: t.price,
    capacity: t.capacity,
    available: t.available ?? t.capacity,
    description: t.description,
    maxPerOrder: t.maxPerOrder || 5,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 space-y-8">
      {/* 1. Navigation Breadcrumb & Bookmark Action */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-notari-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all events</span>
        </Link>

        <BookmarkButton
          eventId={event._id.toString()}
          initialIsBookmarked={isBookmarked}
          variant="button"
          showLabel={true}
          isAuthenticated={Boolean(sessionUser)}
          isStudent={Boolean(isStudent)}
        />
      </div>

      {/* 2. Hero Cover Banner */}
      {(() => {
        const flyerVisual = event.flyerUrl || (event as { flyerImage?: string }).flyerImage;
        return (
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-md bg-slate-100">
            <EventFlyerImage
              src={flyerVisual}
              alt={event.title}
              title={event.title}
              category={event.category}
              priority
              containerClassName="rounded-3xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 flex items-center justify-between text-white z-10">
              <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-white/20 text-xs font-semibold px-3 py-1">
                {event.category}
              </Badge>
              {event.isFree && <StatusPill status="free" />}
            </div>
          </div>
        );
      })()}

      {/* 3. Main Event Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details, Description, and Ticket Tiers */}
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-notari-primary border border-indigo-200/80">
                <School className="w-3.5 h-3.5" />
                <span>{event.faculty || "Obafemi Awolowo University"}</span>
              </span>
              {event.isFree ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Free Admission
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Ticketed Event
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-notari-dark tracking-tight leading-tight">
              {event.title}
            </h1>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-xs sm:text-sm text-slate-600 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <User className="w-4 h-4 text-notari-primary shrink-0" />
                <span className="truncate">Organizer: <strong className="text-notari-dark">{event.organizerName}</strong></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-notari-primary shrink-0" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-notari-primary shrink-0" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-notari-primary shrink-0" />
                <span className="truncate">{event.venue}</span>
              </div>
            </div>
          </div>

          {/* About Event Description */}
          <div className="space-y-3">
            <h3 className="text-lg sm:text-xl font-bold text-notari-dark">About This Event</h3>
            <div className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              {event.description}
            </div>
          </div>

          {/* Ticket Tiers Breakdown */}
          {ticketTiers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">Available Ticket Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ticketTiers.map((tier) => {
                  const tierPrice = event.isFree || tier.price === 0 ? "Free" : `₦${tier.price.toLocaleString()}`;
                  const tierAvailable = tier.available ?? tier.capacity;
                  const isTierSoldOut = tierAvailable <= 0;

                  return (
                    <Card
                      key={tier.name}
                      className="p-4 sm:p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-notari-dark">{tier.name}</h4>
                          <span className="text-sm font-extrabold text-notari-primary">{tierPrice}</span>
                        </div>
                        {tier.description && (
                          <p className="text-xs text-slate-500 leading-relaxed">{tier.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-400">Availability</span>
                        <span className={isTierSoldOut ? "font-bold text-rose-600" : "font-semibold text-emerald-600"}>
                          {isTierSoldOut ? "Sold Out" : `${tierAvailable} passes left`}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Venue & Location Information */}
          <div className="space-y-3">
            <h3 className="text-lg sm:text-xl font-bold text-notari-dark">Venue & Location</h3>
            <Card className="p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl space-y-2">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-notari-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-notari-dark">{event.venue}</h4>
                  <p className="text-xs text-slate-500">
                    {event.address || "Obafemi Awolowo University Campus, Ile-Ife, Osun State, Nigeria"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column: Desktop Booking Action Card */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <EventBookingCard
            eventId={event._id.toString()}
            eventSlug={event.slug}
            eventTitle={event.title}
            venue={event.venue}
            formattedDate={formattedDate}
            formattedTime={formattedTime}
            organizerName={event.organizerName}
            isFree={event.isFree}
            ticketTiers={serializedTicketTiers}
            sessionUser={sessionUser}
          />
        </div>
      </div>
    </div>
  );
}
