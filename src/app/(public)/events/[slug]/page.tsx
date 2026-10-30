import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  User,
  Ticket,
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = MOCK_EVENTS.find((e) => e.slug === slug) || MOCK_EVENTS[0];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-notari-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to events</span>
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full rounded-3xl overflow-hidden shadow-md">
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details */}
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 text-xs">
                {event.category}
              </Badge>
              {event.isFree && (
                <Badge variant="subtle" className="px-3 py-1 text-xs font-semibold">
                  Free Admission
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-notari-dark tracking-tight leading-tight">
              {event.title}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm text-slate-600">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-notari-primary" />
                <span>{event.organizer}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-notari-primary" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-notari-primary" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-notari-primary" />
                <span>{event.venue}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Mock */}
          <div className="border-b border-slate-200 flex gap-6 text-sm font-semibold">
            <button className="pb-3 border-b-2 border-notari-primary text-notari-primary">
              Overview
            </button>
            <button className="pb-3 text-slate-500 hover:text-slate-700">
              Details
            </button>
            <button className="pb-3 text-slate-500 hover:text-slate-700">
              Organizer
            </button>
            <button className="pb-3 text-slate-500 hover:text-slate-700">
              FAQ
            </button>
          </div>

          {/* About Event Description */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-notari-dark">About This Event</h3>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* What You'll Gain */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-notari-dark">Event Highlights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {event.highlights.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Box */}
        <div className="lg:col-span-4 sticky top-24">
          <Card className="p-6 border-slate-200/90 shadow-md space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Ticket Price</span>
                <div className="text-2xl font-extrabold text-notari-dark mt-0.5">
                  {event.isFree ? "Free Event" : `₦${event.price.toLocaleString()}`}
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {event.available} seats left
              </span>
            </div>

            <div className="space-y-2.5">
              <Link href="/login" className="w-full block">
                <Button className="w-full h-12 rounded-xl text-base font-semibold shadow-md gap-2">
                  <Ticket className="w-5 h-5" />
                  <span>Reserve Your Spot</span>
                </Button>
              </Link>
              <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-medium">
                Add to Calendar
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-semibold text-notari-dark">{event.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span className="font-semibold text-notari-dark">{event.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Venue:</span>
                <span className="font-semibold text-notari-dark">{event.venue}</span>
              </div>
              <div className="flex justify-between">
                <span>Organizer:</span>
                <span className="font-semibold text-notari-dark">{event.organizer}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
