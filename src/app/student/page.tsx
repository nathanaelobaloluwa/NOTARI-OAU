import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS, MOCK_STUDENT_METRICS } from "@/lib/mock-data";
import {
  Calendar,
  Ticket,
  CheckCircle2,
  Bookmark,
  Compass,
  User,
  Clock,
  ChevronRight,
} from "lucide-react";

export default function StudentDashboardPage() {
  const registeredEvents = MOCK_EVENTS.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Good morning, Adeola! 👋
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Here&apos;s what&apos;s happening with your campus events and tickets today.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-notari-primary flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Upcoming</p>
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{MOCK_STUDENT_METRICS.upcomingEvents}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">My Tickets</p>
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{MOCK_STUDENT_METRICS.myTickets}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Attended</p>
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{MOCK_STUDENT_METRICS.eventsAttended}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Saved</p>
              <h3 className="text-lg sm:text-xl font-bold text-notari-dark">{MOCK_STUDENT_METRICS.savedEvents}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid: Upcoming Events + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Upcoming Events */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-notari-dark">Upcoming Events</h2>
            <Link
              href="/student/my-events"
              className="text-xs font-semibold text-notari-primary hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {registeredEvents.map((evt) => (
              <Card
                key={evt.id}
                className="p-4 border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
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
                    <h4 className="text-sm font-bold text-notari-dark line-clamp-1">{evt.title}</h4>
                    <p className="text-xs text-slate-500">{evt.organizer}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{evt.date} • {evt.time.split("-")[0]}</span>
                      <span>•</span>
                      <span className="truncate">{evt.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <StatusPill status="confirmed" />
                  <Link href={`/events/${evt.slug}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg">
                      View
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Quick Actions & Countdown Banner */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-slate-200/80 shadow-sm bg-white space-y-4">
            <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/events" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold">
                  <Compass className="w-4 h-4 text-notari-primary" />
                  <span>Browse Events</span>
                </Button>
              </Link>
              <Link href="/student/tickets" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>View My Tickets</span>
                </Button>
              </Link>
              <Link href="/student/saved" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold">
                  <Bookmark className="w-4 h-4 text-purple-600" />
                  <span>Saved Events</span>
                </Button>
              </Link>
              <Link href="/student/settings" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold">
                  <User className="w-4 h-4 text-slate-600" />
                  <span>Update Profile</span>
                </Button>
              </Link>
            </div>
          </Card>

          {/* Next event countdown box */}
          <Card className="p-6 bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white border-0 shadow-md space-y-3">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Upcoming Reminder</span>
            </div>
            <h4 className="text-lg font-bold leading-snug">
              Your next event is in 3 days!
            </h4>
            <p className="text-xs text-indigo-100">
              OAU Tech Summit 2025 starts Sat, Nov 15 at Engineering Auditorium. Make sure to download your ticket pass.
            </p>
            <div className="pt-2">
              <Link href="/student/tickets">
                <Button size="sm" variant="secondary" className="w-full text-xs font-bold rounded-lg shadow">
                  Access Digital Pass
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
