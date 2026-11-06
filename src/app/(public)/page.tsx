import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { CampusHeroVisual } from "@/components/home/CampusHeroVisual";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { EVENT_STATUS, OAU_FACULTIES, EVENT_CATEGORIES } from "@/constants/oau";
import {
  Search,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Compass,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connectToDatabase();

  const publishedEvents = await Event.find({ status: EVENT_STATUS.PUBLISHED })
    .select("-rejectionReason")
    .sort({ isFeatured: -1, startDate: 1 })
    .limit(5)
    .lean();

  const featuredEvent = publishedEvents[0];
  const upcomingEvents = publishedEvents.slice(1, 5);

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-950 text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & Search Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wider uppercase text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Obafemi Awolowo University</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Discover Events. <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
                  Build Your Tomorrow.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Find exciting academic symposiums, tech hackathons, departmental dinners, and concerts across all faculties. Reserve your digital pass in seconds.
              </p>

              {/* SEARCH & FILTER FORM */}
              <div className="pt-2">
                <form
                  action="/events"
                  method="GET"
                  className="bg-white p-2.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 max-w-2xl text-notari-dark border border-slate-200"
                >
                  <div className="relative flex-1 w-full flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      name="search"
                      placeholder="Search events, workshops, or organisers..."
                      className="w-full bg-transparent pl-10 pr-3 py-2 text-sm focus:outline-none placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <select
                      name="faculty"
                      className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="">All Faculties</option>
                      {OAU_FACULTIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>

                    <Button type="submit" className="w-full sm:w-auto rounded-xl px-5 gap-1.5 font-medium shadow-md">
                      <Search className="w-4 h-4" />
                      <span>Find</span>
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Popular:</span>
                  <Link href="/events?category=Tech+%26+Innovation" className="hover:text-white underline-offset-4 hover:underline">
                    Tech & Innovation
                  </Link>
                  <span>•</span>
                  <Link href="/events?category=Music+%26+Concerts" className="hover:text-white underline-offset-4 hover:underline">
                    Music & Concerts
                  </Link>
                  <span>•</span>
                  <Link href="/events?category=Academic+%26+Educational" className="hover:text-white underline-offset-4 hover:underline">
                    Academic
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Great Ife Campus Visual Hero Card */}
            <div className="lg:col-span-5 relative">
              <CampusHeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED EVENT SECTION (When Published Events Exist) */}
      {featuredEvent ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-notari-dark tracking-tight">Featured Event</h2>
              <p className="text-sm text-slate-500">Highlighted university conferences, summits, and premier experiences</p>
            </div>
            <Link href="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-notari-primary hover:text-indigo-700 group">
              <span>View all</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Featured Event Card */}
            <div className="lg:col-span-8">
              <Card className="overflow-hidden border-slate-200/90 shadow-sm hover:shadow-lg transition-all group rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-12">
                  <div className="md:col-span-6 relative aspect-[16/10] md:aspect-auto bg-slate-100">
                    {featuredEvent.flyerUrl ? (
                      <Image
                        src={featuredEvent.flyerUrl}
                        alt={featuredEvent.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50 text-notari-primary p-6 text-center">
                        <Calendar className="w-10 h-10 mb-2 opacity-70" />
                        <span className="text-xs font-bold uppercase">{featuredEvent.category}</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-notari-primary text-white shadow">Featured</Badge>
                    </div>
                  </div>

                  <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="subtle" className="text-xs">
                          {featuredEvent.category}
                        </Badge>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{featuredEvent.organizerName}</span>
                      </div>

                      <h3 className="text-2xl font-bold text-notari-dark group-hover:text-notari-primary transition-colors">
                        {featuredEvent.title}
                      </h3>

                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {featuredEvent.description}
                      </p>

                      <div className="pt-2 space-y-2 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          <span>
                            {new Date(featuredEvent.startDate).toLocaleDateString("en-NG", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <span className="truncate">{featuredEvent.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-semibold text-emerald-600">
                        {featuredEvent.isFree ? "Free Admission" : "Ticketed"}
                      </div>

                      <Link href={`/events/${featuredEvent.slug}`}>
                        <Button className="rounded-xl px-5 gap-1.5 font-medium shadow-sm">
                          <span>View Details</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Campus Promo Card */}
            <div className="lg:col-span-4">
              <Card className="h-full bg-slate-950 text-white p-8 flex flex-col justify-between border-0 shadow-lg relative overflow-hidden rounded-2xl group">
                {/* Background Authentic OAU Amphitheatre Photograph */}
                <Image
                  src="/images/oau/oau-amphitheatre-stage.jpg"
                  alt="Amphitheatre Stage, Obafemi Awolowo University"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover opacity-20 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-indigo-950/80 to-indigo-900/70" />

                <div className="relative z-10 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Great Ife Community
                  </span>
                  <h3 className="text-2xl font-bold leading-tight">
                    Your Campus. <br />
                    Your Events.
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Stay connected, get involved, and make the most of your university experience at Great Ife.
                  </p>
                </div>

                <div className="relative z-10 pt-6">
                  <Link href="/events">
                    <Button variant="secondary" className="w-full rounded-xl font-semibold shadow-md gap-2">
                      <Compass className="w-4 h-4" />
                      <span>Browse All Events</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. UPCOMING EVENTS GRID */}
      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-notari-dark tracking-tight">Upcoming Events</h2>
              <p className="text-sm text-slate-500">Discover what is happening across Great Ife this month</p>
            </div>
            <Link href="/events" className="text-sm font-semibold text-notari-primary hover:text-indigo-700">
              Browse All ({publishedEvents.length})
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {upcomingEvents.map((evt) => (
              <Card
                key={evt._id.toString()}
                className="overflow-hidden border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col rounded-2xl bg-white"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {evt.flyerUrl ? (
                    <Image
                      src={evt.flyerUrl}
                      alt={evt.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-notari-primary font-bold text-xs uppercase">
                      {evt.category}
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="text-[11px] shadow">
                      {evt.category}
                    </Badge>
                  </div>
                  {evt.isFree && (
                    <div className="absolute top-3 right-3">
                      <StatusPill status="free" />
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 truncate">{evt.organizerName}</p>
                    <h4 className="font-bold text-notari-dark group-hover:text-notari-primary transition-colors line-clamp-1">
                      {evt.title}
                    </h4>
                    <div className="space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(evt.startDate).toLocaleDateString("en-NG", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-notari-dark">
                      {evt.isFree ? "Free" : "Paid"}
                    </span>
                    <Link href={`/events/${evt.slug}`}>
                      <Button size="sm" variant="subtle" className="rounded-lg h-8 px-3 text-xs">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 4. ICONIC GREAT IFE EVENT VENUES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-notari-primary mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Campus Landmarks</span>
            </div>
            <h2 className="text-2xl font-bold text-notari-dark tracking-tight">Iconic Great Ife Venues</h2>
            <p className="text-sm text-slate-500">Discover where memorable events, symposiums, and celebrations take place</p>
          </div>
          <Link href="/events" className="text-sm font-semibold text-notari-primary hover:text-indigo-700 flex items-center gap-1 shrink-0">
            <span>Explore all campus venues</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Oduduwa Hall */}
          <Link
            href="/events?search=Oduduwa+Hall"
            className="group relative rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all flex flex-col"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
              <Image
                src="/images/oau/oau-oduduwa-hall.jpg"
                alt="Oduduwa Hall, Obafemi Awolowo University"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Central Auditorium</span>
                <h3 className="text-lg font-bold">Oduduwa Hall</h3>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <p className="text-xs text-slate-600 line-clamp-2">
                The grand architectural centerpiece for university convocations, public lectures, awards, and student conferences.
              </p>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-notari-primary">
                <span>View Oduduwa Hall Events</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Card 2: Amphitheatre */}
          <Link
            href="/events?search=Amphitheatre"
            className="group relative rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all flex flex-col"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
              <Image
                src="/images/oau/oau-amphitheatre-stage.jpg"
                alt="OAU Amphitheatre Stage"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Open-Air Stage</span>
                <h3 className="text-lg font-bold">OAU Amphitheatre</h3>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <p className="text-xs text-slate-600 line-clamp-2">
                Great Ife&apos;s renowned tiered open arena, home to matriculation rites, campus congresses, concerts, and cultural nights.
              </p>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-notari-primary">
                <span>View Amphitheatre Events</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Card 3: Senate Building & Grounds */}
          <Link
            href="/events"
            className="group relative rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-all flex flex-col"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
              <Image
                src="/images/oau/oau-senate-building.png"
                alt="Obafemi Awolowo University Senate Building"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Administrative Hub</span>
                <h3 className="text-lg font-bold">Senate Building & Grounds</h3>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <p className="text-xs text-slate-600 line-clamp-2">
                The administrative pulse of Africa&apos;s most beautiful campus, connecting faculties, centers, and official student bodies.
              </p>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-notari-primary">
                <span>Explore Campus Activities</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 5. CATEGORIES EXPLORATION GRID */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-notari-dark tracking-tight">Explore By Category</h2>
          <p className="text-sm text-slate-500">Find events tailored to your interests and faculty activities</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {EVENT_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/events?category=${encodeURIComponent(cat)}`}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-notari-primary hover:shadow-sm transition-all text-center space-y-1.5 group block"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-notari-primary flex items-center justify-center mx-auto group-hover:bg-notari-primary group-hover:text-white transition-colors">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-notari-dark group-hover:text-notari-primary transition-colors line-clamp-1">
                {cat}
              </h4>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
