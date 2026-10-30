import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_ORGANIZER_METRICS, MOCK_EVENTS } from "@/lib/mock-data";
import {
  Calendar,
  Ticket,
  DollarSign,
  Clock,
  PlusCircle,
  FileText,
  Users,
  BarChart,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function OrganizerDashboardPage() {
  const organizerEvents = MOCK_EVENTS.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Welcome back, Campus Org! 🎪
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Here&apos;s your campus event ticketing performance and sales metrics at a glance.
          </p>
        </div>

        <Link href="/organizer/events/create">
          <Button className="rounded-xl px-5 gap-2 bg-purple-600 hover:bg-purple-700 shadow-sm text-xs font-semibold">
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Button>
        </Link>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Events</p>
              <h3 className="text-2xl font-bold text-notari-dark">{MOCK_ORGANIZER_METRICS.totalEvents}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Bookings</p>
              <h3 className="text-2xl font-bold text-notari-dark">{MOCK_ORGANIZER_METRICS.totalBookings}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-notari-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-notari-dark">₦820,000</h3>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200/80 shadow-sm bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Upcoming Events</p>
              <h3 className="text-2xl font-bold text-notari-dark">{MOCK_ORGANIZER_METRICS.upcomingEvents}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Sales Graph + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sales Overview Chart */}
        <div className="lg:col-span-8">
          <Card className="p-6 border-slate-200/80 shadow-sm bg-white space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-notari-dark">Event Sales Overview</h3>
                <p className="text-xs text-slate-400">Weekly ticket volume & checkout conversions</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+18.4%</span>
                </span>
                <select className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>This Semester</option>
                </select>
              </div>
            </div>

            {/* SVG Visual Graph matching screenshot */}
            <div className="h-56 w-full pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="orgSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="30" x2="600" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="130" x2="600" y2="130" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="0" y1="180" x2="600" y2="180" stroke="#F1F5F9" strokeWidth="1" />

                {/* Filled Area */}
                <path
                  d="M 20 160 C 100 140, 160 170, 240 120 C 320 80, 400 130, 480 70 C 530 40, 560 50, 580 40 L 580 180 L 20 180 Z"
                  fill="url(#orgSalesGrad)"
                />

                {/* Stroke Line */}
                <path
                  d="M 20 160 C 100 140, 160 170, 240 120 C 320 80, 400 130, 480 70 C 530 40, 560 50, 580 40"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                <circle cx="20" cy="160" r="4" fill="#7C3AED" />
                <circle cx="240" cy="120" r="4" fill="#7C3AED" />
                <circle cx="480" cy="70" r="4" fill="#7C3AED" />
                <circle cx="580" cy="40" r="5" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2" />
              </svg>

              <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-2 px-2">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4">
          <Card className="p-6 border-slate-200/80 shadow-sm bg-white space-y-4">
            <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
              Quick Actions
            </h3>

            <div className="space-y-2.5">
              <Link href="/organizer/events/create" className="block">
                <Button className="w-full justify-start gap-2.5 h-11 text-xs font-semibold bg-purple-600 hover:bg-purple-700 shadow-sm">
                  <PlusCircle className="w-4 h-4" />
                  <span>Create New Event</span>
                </Button>
              </Link>
              <Link href="/organizer/events" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Manage Events</span>
                </Button>
              </Link>
              <Link href="/organizer/orders" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>View Bookings</span>
                </Button>
              </Link>
              <Link href="/organizer/analytics" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold">
                  <BarChart className="w-4 h-4 text-indigo-600" />
                  <span>View Reports & Analytics</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Organizer Events Table */}
      <Card className="p-6 border-slate-200/80 shadow-sm bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-notari-dark">My Active Events</h3>
          <Link href="/organizer/events" className="text-xs font-semibold text-purple-600 hover:underline">
            View All Events
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Event</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Bookings</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizerEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 font-bold text-notari-dark">{evt.title}</td>
                  <td className="py-3.5 text-slate-500">{evt.date}</td>
                  <td className="py-3.5 text-slate-700 font-semibold">{evt.registered} / {evt.capacity}</td>
                  <td className="py-3.5">
                    <StatusPill status={evt.status} />
                  </td>
                  <td className="py-3.5 text-right">
                    <Link href={`/organizer/events/${evt.id}`} className="text-purple-600 hover:underline font-semibold">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
