import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import {
  MOCK_EVENTS,
  MOCK_RECENT_ACTIVITY,
  MOCK_ADMIN_METRICS,
} from "@/lib/mock-data";
import {
  Calendar,
  CalendarCheck2,
  Ticket,
  CircleDollarSign,
  Users,
  ShieldCheck,
  Eye,
  FileBarChart,
  ChevronRight,
  TrendingUp,
  Server,
  CreditCard,
  Mail,
  HardDrive,
  Cpu,
  Clock,
  Sparkles,
  Flame,
} from "lucide-react";

export default function AdminDashboardPage() {
  const recentEvents = MOCK_EVENTS.slice(0, 5);

  const topPerformingEvents = [
    { rank: 1, title: "OAU Tech Summit 2025", bookings: "350 bookings", revenue: "₦1,250,000", image: MOCK_EVENTS[0].image },
    { rank: 2, title: "Creative Writing Workshop", bookings: "248 bookings", revenue: "₦620,000", image: MOCK_EVENTS[1].image },
    { rank: 3, title: "Career Fair 2025", bookings: "196 bookings", revenue: "₦980,000", image: MOCK_EVENTS[4].image },
    { rank: 4, title: "Mental Health Awareness", bookings: "142 bookings", revenue: "₦355,000", image: MOCK_EVENTS[3].image },
    { rank: 5, title: "Robotics Workshop", bookings: "98 bookings", revenue: "₦420,000", image: MOCK_EVENTS[2].image },
  ];

  return (
    <div className="space-y-8">
      {/* Top Section: Welcome + Campus Banner + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Welcome Info */}
        <div className="lg:col-span-4 flex flex-col justify-center space-y-2">
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
            WELCOME BACK, ADMIN
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#101C3A] tracking-tight leading-tight">
            Here&apos;s what&apos;s happening on your platform today.
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Manage events, users, and keep the OAU community connected.
          </p>
        </div>

        {/* Center Banner Card: OAU Landmark */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-sm flex flex-col justify-end p-6 min-h-[180px] group">
          <Image
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80"
            alt="Obafemi Awolowo University Campus"
            fill
            className="object-cover opacity-35 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-transparent to-transparent" />
          <div className="relative z-10 space-y-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-300 block">
              OBAFEMI AWOLOWO UNIVERSITY
            </span>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Great Events. Stronger Community.
            </h3>
            <p className="text-[11px] text-slate-300">
              Empowering students through meaningful campus experiences.
            </p>
          </div>
        </div>

        {/* Right Quick Actions Card */}
        <div className="lg:col-span-3">
          <Card className="h-full p-4 border-slate-200/80 bg-white shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#101C3A]">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Quick Actions</span>
            </div>

            <div className="space-y-1.5">
              <Link href="/admin/events/create" className="block">
                <Button className="w-full justify-between h-9 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Create New Event</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                </Button>
              </Link>

              <Link
                href="/admin/users"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Manage Users</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/admin/approvals"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Approve Organizers</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                    {MOCK_ADMIN_METRICS.pendingApprovals}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </Link>

              <Link
                href="/admin/events"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>View All Events</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/admin/analytics"
                className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileBarChart className="w-3.5 h-3.5 text-slate-400" />
                  <span>Generate Reports</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* 4 Platform Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Events */}
        <Card className="p-3.5 sm:p-5 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Events</p>
                <h3 className="text-lg sm:text-2xl font-extrabold text-[#101C3A] mt-0.5">48</h3>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-0.5 text-xs font-bold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12%</span>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-400">
            vs. last 30 days
          </div>
        </Card>

        {/* Published Events */}
        <Card className="p-3.5 sm:p-5 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                <CalendarCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Published</p>
                <h3 className="text-lg sm:text-2xl font-extrabold text-[#101C3A] mt-0.5">36</h3>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-0.5 text-xs font-bold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+20%</span>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-400">
            vs. last 30 days
          </div>
        </Card>

        {/* Total Bookings */}
        <Card className="p-3.5 sm:p-5 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shrink-0">
                <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Bookings</p>
                <h3 className="text-lg sm:text-2xl font-extrabold text-[#101C3A] mt-0.5">1,248</h3>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-0.5 text-xs font-bold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+48%</span>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-400">
            vs. last 30 days
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="p-3.5 sm:p-5 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shrink-0">
                <CircleDollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Revenue</p>
                <h3 className="text-base sm:text-2xl font-extrabold text-[#101C3A] mt-0.5 truncate">₦2,560,000</h3>
              </div>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-400">
            vs. last 30 days
          </div>
        </Card>
      </div>

      {/* Analytics & Status Section (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Column 1: Event & Booking Overview Graph (6 cols) */}
        <div className="lg:col-span-6">
          <Card className="p-4 sm:p-6 border-slate-200/80 bg-white shadow-xs h-full flex flex-col justify-between space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#101C3A]">Event & Booking Overview</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5 text-[10px] sm:text-[11px] text-slate-500 mr-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Created</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Bookings</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Revenue</span>
                  </span>
                </div>
                <select className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] sm:text-[11px] text-slate-600">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                </select>
              </div>
            </div>

            {/* SVG Visual Multi-Line Chart matching mockup */}
            <div className="h-56 w-full pt-4">
              <svg className="w-full h-full" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="adminChartRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis grid lines */}
                <line x1="40" y1="20" x2="580" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="40" y1="60" x2="580" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="40" y1="100" x2="580" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="40" y1="140" x2="580" y2="140" stroke="#F1F5F9" strokeWidth="1" />
                <line x1="40" y1="180" x2="580" y2="180" stroke="#F1F5F9" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x="25" y="24" fontSize="10" fill="#94A3B8" textAnchor="end">50</text>
                <text x="25" y="64" fontSize="10" fill="#94A3B8" textAnchor="end">40</text>
                <text x="25" y="104" fontSize="10" fill="#94A3B8" textAnchor="end">30</text>
                <text x="25" y="144" fontSize="10" fill="#94A3B8" textAnchor="end">20</text>
                <text x="25" y="184" fontSize="10" fill="#94A3B8" textAnchor="end">0</text>

                {/* Revenue Curve (Purple) */}
                <path
                  d="M 50 140 C 130 110, 200 130, 280 80 C 360 120, 440 60, 560 40"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="2.5"
                />
                <circle cx="50" cy="140" r="3.5" fill="#7C3AED" />
                <circle cx="280" cy="80" r="3.5" fill="#7C3AED" />
                <circle cx="560" cy="40" r="3.5" fill="#7C3AED" />

                {/* Bookings Curve (Emerald) */}
                <path
                  d="M 50 160 C 130 145, 200 150, 280 115 C 360 125, 440 95, 560 75"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                />
                <circle cx="50" cy="160" r="3.5" fill="#10B981" />
                <circle cx="280" cy="115" r="3.5" fill="#10B981" />
                <circle cx="560" cy="75" r="3.5" fill="#10B981" />

                {/* Events Created Curve (Blue) */}
                <path
                  d="M 50 175 C 130 170, 200 168, 280 155 C 360 160, 440 145, 560 135"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                />
                <circle cx="50" cy="175" r="3.5" fill="#3B82F6" />
                <circle cx="280" cy="155" r="3.5" fill="#3B82F6" />
                <circle cx="560" cy="135" r="3.5" fill="#3B82F6" />
              </svg>

              <div className="flex justify-between text-[10px] font-medium text-slate-400 px-6">
                <span>Apr 28</span>
                <span>Apr 29</span>
                <span>Apr 30</span>
                <span>May 1</span>
                <span>May 2</span>
                <span>May 3</span>
                <span>May 4</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Column 2: Event Categories Donut Breakdown (3 cols) */}
        <div className="lg:col-span-3">
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs h-full flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#101C3A]">Event Categories</h3>
              <span className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer">
                View All
              </span>
            </div>

            {/* Donut graphic */}
            <div className="relative flex items-center justify-center my-2">
              <svg className="w-32 h-32" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="55 200" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="45 200" strokeDashoffset="-55" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="35 200" strokeDashoffset="-100" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#8B5CF6" strokeWidth="12" strokeDasharray="30 200" strokeDashoffset="-135" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#EC4899" strokeWidth="12" strokeDasharray="25 200" strokeDashoffset="-165" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#64748B" strokeWidth="12" strokeDasharray="30 200" strokeDashoffset="-190" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[#101C3A]">48</span>
                <span className="text-[10px] text-slate-400 font-medium">Events</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Music & Concerts</span>
                </span>
                <span className="font-semibold text-slate-700">22% (11)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Academic</span>
                </span>
                <span className="font-semibold text-slate-700">19% (9)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Sports & Recreation</span>
                </span>
                <span className="font-semibold text-slate-700">15% (7)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Career & Professional</span>
                </span>
                <span className="font-semibold text-slate-700">13% (6)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>Arts & Culture</span>
                </span>
                <span className="font-semibold text-slate-700">10% (5)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Column 3: System Status (3 cols) */}
        <div className="lg:col-span-3">
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs h-full flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-emerald-800">All Systems Operational</h3>
              </div>
              <p className="text-[10px] text-slate-400">
                Last checked: May 4, 2025 • 10:24 AM
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                  <span>Database</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600">Online</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Payment Gateway</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600">Online</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email Service</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600">Online</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span>File Storage</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600">Online</span>
              </div>

              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  <span>API Endpoints</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600">Online</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Grid: Recent Events + Recent Activity + Top Performing (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Events Table (6 cols) */}
        <div className="lg:col-span-6">
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#101C3A]">Recent Events</h3>
              </div>
              <Link href="/admin/events" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Organizer</th>
                    <th className="pb-3">Date & Time</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/60">
                      <td className="py-3 font-semibold text-notari-dark max-w-[140px] truncate">
                        {evt.title}
                      </td>
                      <td className="py-3 text-slate-500 max-w-[120px] truncate">
                        {evt.organizer}
                      </td>
                      <td className="py-3 text-slate-400 text-[11px]">
                        {evt.date} • {evt.time.split("-")[0]}
                      </td>
                      <td className="py-3">
                        <StatusPill status={evt.status} />
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/admin/events/${evt.id}`} className="text-blue-600 hover:underline font-semibold text-[11px]">
                          View &gt;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Recent Activity Timeline (3 cols) */}
        <div className="lg:col-span-3">
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#101C3A]">Recent Activity</h3>
              </div>
              <span className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                View All &gt;
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {MOCK_RECENT_ACTIVITY.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-semibold text-notari-dark leading-tight">{act.title}</p>
                    <p className="text-slate-500 text-[11px] truncate">{act.description}</p>
                    <span className="text-[10px] text-slate-400 block">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top Performing Events (3 cols) */}
        <div className="lg:col-span-3">
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-[#101C3A]">Top Performing Events</h3>
              </div>
              <span className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                View All
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {topPerformingEvents.map((top) => (
                <div key={top.rank} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center font-bold text-slate-400 text-xs">
                      {top.rank}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-notari-dark truncate max-w-[130px]">
                        {top.title}
                      </p>
                      <span className="text-[10px] text-slate-400 block">{top.bookings}</span>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 text-xs shrink-0">
                    {top.revenue}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
