import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { OAU_FACULTIES } from "@/constants/oau";
import {
  Search,
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Sparkles,
  Ticket,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function HomePage() {
  const featuredEvent = MOCK_EVENTS[0];
  const upcomingEvents = MOCK_EVENTS.slice(1, 5);

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-indigo-950 to-slate-950 text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & Search */}
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

              {/* SEARCH & FILTER BAR */}
              <div className="pt-2">
                <div className="bg-white p-2.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 max-w-2xl text-notari-dark border border-slate-200">
                  <div className="relative flex-1 w-full flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search events, workshops, or organisers..."
                      className="w-full bg-transparent pl-10 pr-3 py-2 text-sm focus:outline-none placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <select className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none">
                      <option value="">All Faculties</option>
                      {OAU_FACULTIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>

                    <Link href="/events" className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto rounded-xl px-5 gap-1.5 font-medium shadow-md">
                        <Search className="w-4 h-4" />
                        <span>Find</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Popular:</span>
                  <Link href="/events?category=Tech+%26+Innovation" className="hover:text-white underline-offset-4 hover:underline">
                    Tech Summit
                  </Link>
                  <span>•</span>
                  <Link href="/events?category=Music+%26+Concerts" className="hover:text-white underline-offset-4 hover:underline">
                    Oduduwa Hall Shows
                  </Link>
                  <span>•</span>
                  <Link href="/events?category=Academic+%26+Educational" className="hover:text-white underline-offset-4 hover:underline">
                    Faculty Symposia
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Campus Visual Hero Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900/80 backdrop-blur-md group">
                <div className="aspect-[4/3] relative w-full overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1000&auto=format&fit=crop&q=80"
                    alt="OAU Campus Great Ife"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>

                <div className="absolute bottom-0 inset-x-0 p-6 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/30 backdrop-blur-md border border-indigo-400/30 text-xs font-semibold text-indigo-200">
                    <span>Great Ife Campus Life</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">More Events. More Connections.</h3>
                  <p className="text-xs text-slate-300">
                    Connect with fellow Great Ife students, departmental clubs, and faculty associations on one unified platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED EVENTS SECTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-notari-dark tracking-tight">Featured Events</h2>
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
            <Card className="overflow-hidden border-slate-200/90 shadow-sm hover:shadow-lg transition-all group">
              <div className="grid grid-cols-1 md:grid-cols-12">
                <div className="md:col-span-6 relative aspect-[16/10] md:aspect-auto">
                  <Image
                    src={featuredEvent.image}
                    alt={featuredEvent.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
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
                      <span className="text-xs text-slate-500">{featuredEvent.organizer}</span>
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
                        <span>{featuredEvent.date} • {featuredEvent.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        <span>{featuredEvent.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{featuredEvent.available} seats left</span>
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
            <Card className="h-full bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8 flex flex-col justify-between border-0 shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Campus Community
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
                <Link href="/register">
                  <Button variant="secondary" className="w-full rounded-xl font-semibold shadow-md">
                    Join NOTARI Today
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS GRID */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-notari-dark tracking-tight">Upcoming Events</h2>
            <p className="text-sm text-slate-500">Discover what is happening across Great Ife this month</p>
          </div>
          <Link href="/events" className="text-sm font-semibold text-notari-primary hover:text-indigo-700">
            Browse All ({MOCK_EVENTS.length})
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {upcomingEvents.map((evt) => (
            <Card
              key={evt.id}
              className="overflow-hidden border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <Image
                  src={evt.image}
                  alt={evt.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
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
                  <p className="text-xs font-medium text-slate-500 truncate">{evt.organizer}</p>
                  <h4 className="font-bold text-notari-dark group-hover:text-notari-primary transition-colors line-clamp-1">
                    {evt.title}
                  </h4>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.date} • {evt.time.split("-")[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600">
                    {evt.available} seats left
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
    </div>
  );
}
