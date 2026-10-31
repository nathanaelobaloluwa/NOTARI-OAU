import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { EVENT_STATUS } from "@/constants/oau";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Ticket,
  Sparkles,
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
  const totalCapacity = event.totalCapacity || ticketTiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalAvailable = ticketTiers.reduce((acc, t) => acc + (t.available ?? t.capacity), 0);
  const isSoldOut = totalCapacity > 0 && totalAvailable <= 0;

  const lowestPrice = event.isFree
    ? 0
    : ticketTiers.length > 0
    ? Math.min(...ticketTiers.map((t) => t.price))
    : 0;

  const priceDisplay = event.isFree || lowestPrice === 0 ? "Free Event" : `₦${lowestPrice.toLocaleString()}`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 space-y-8">
      {/* 1. Navigation Breadcrumb */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-notari-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all events</span>
        </Link>
      </div>

      {/* 2. Hero Cover Banner */}
      <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-md bg-slate-100">
        {event.flyerUrl ? (
          <Image
            src={event.flyerUrl}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white p-6 text-center">
            <Sparkles className="w-12 h-12 mb-3 text-indigo-300" />
            <span className="text-sm font-bold tracking-widest uppercase text-indigo-200">{event.category}</span>
            <h2 className="text-xl sm:text-3xl font-extrabold mt-1 max-w-2xl">{event.title}</h2>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 flex items-center justify-between text-white">
          <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-white/20 text-xs font-semibold px-3 py-1">
            {event.category}
          </Badge>
          {event.isFree && <StatusPill status="free" />}
        </div>
      </div>

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
          <Card className="p-6 border-slate-200/90 shadow-md space-y-6 rounded-2xl bg-white">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Admission</span>
                <div className="text-2xl font-extrabold text-notari-dark mt-0.5">
                  {priceDisplay}
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  isSoldOut
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                }`}
              >
                {isSoldOut ? "Sold Out" : `${totalAvailable} seats left`}
              </span>
            </div>

            <div className="space-y-2.5">
              {isSoldOut ? (
                <Button disabled className="w-full h-12 rounded-xl text-sm font-semibold opacity-60">
                  Event Sold Out
                </Button>
              ) : (
                <Link href={`/login?callbackUrl=/events/${event.slug}`} className="w-full block">
                  <Button className="w-full h-12 rounded-xl text-sm font-semibold shadow-md gap-2">
                    <Ticket className="w-4 h-4" />
                    <span>Reserve Your Spot</span>
                  </Button>
                </Link>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-semibold text-notari-dark">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span className="font-semibold text-notari-dark">{formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Venue:</span>
                <span className="font-semibold text-notari-dark truncate max-w-[180px]">{event.venue}</span>
              </div>
              <div className="flex justify-between">
                <span>Organizer:</span>
                <span className="font-semibold text-notari-dark truncate max-w-[180px]">{event.organizerName}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. Mobile Sticky Booking Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3.5 sm:px-6 shadow-[0_-4px_20px_rgba(16,28,58,0.08)] pb-safe">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Price</span>
            <span className="text-lg font-extrabold text-notari-dark">
              {priceDisplay}
            </span>
          </div>
          <div className="flex-1 max-w-[220px]">
            {isSoldOut ? (
              <Button disabled className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold opacity-60">
                Sold Out
              </Button>
            ) : (
              <Link href={`/login?callbackUrl=/events/${event.slug}`} className="w-full block">
                <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md gap-2">
                  <Ticket className="w-4 h-4" />
                  <span>Reserve Spot</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
