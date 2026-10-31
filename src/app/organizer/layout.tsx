"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotariLogo } from "@/components/shared/notari-logo";
import { OrganizerBottomNav } from "@/components/organizer/organizer-bottom-nav";
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Ticket,
  Users,
  QrCode,
  DollarSign,
  BarChart3,
  Building,
  LogOut,
  Bell,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ORGANIZER_NAV = [
  { name: "Dashboard", href: "/organizer", icon: LayoutDashboard },
  { name: "My Events", href: "/organizer/events", icon: Calendar },
  { name: "Create Event", href: "/organizer/events/create", icon: PlusCircle },
  { name: "Ticket Tiers", href: "/organizer/tickets", icon: Ticket },
  { name: "Orders & Bookings", href: "/organizer/orders", icon: DollarSign },
  { name: "Attendees", href: "/organizer/attendees", icon: Users },
  { name: "QR Check-in", href: "/organizer/check-in", icon: QrCode },
  { name: "Payouts", href: "/organizer/payouts", icon: DollarSign },
  { name: "Analytics", href: "/organizer/analytics", icon: BarChart3 },
  { name: "Organization Profile", href: "/organizer/profile", icon: Building },
];

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const orgName = session?.user?.name || "Campus Org";
  const orgInitials =
    orgName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CO";

  return (
    <div className="min-h-screen bg-notari-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 sticky top-0 h-screen select-none">
        <div className="space-y-6">
          <div className="px-2">
            <NotariLogo variant="organizer" />
          </div>

          <nav className="space-y-1">
            {ORGANIZER_NAV.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-notari-dark"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Organizer Profile Summary */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
              {orgInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-notari-dark truncate">{orgName}</span>
              <span className="text-[11px] text-emerald-600 font-semibold truncate">Verified Organizer</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors w-full text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Dashboard App-Style Header Logo */}
            <div className="lg:hidden shrink-0">
              <NotariLogo variant="organizer" />
            </div>

            {/* Desktop Search Bar */}
            <div className="relative hidden sm:flex items-center w-64 md:w-80">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, tickets, attendees..."
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link href="/organizer/events/create">
              <button className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-sm transition-all cursor-pointer">
                <PlusCircle className="w-4 h-4" />
                <span>New Event</span>
              </button>
            </Link>
            <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-600" />
            </button>
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs ring-1 ring-purple-200">
              {orgInitials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <OrganizerBottomNav />
      </div>
    </div>
  );
}
