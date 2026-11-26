"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotariLogo } from "@/components/shared/notari-logo";
import { OrganizerBottomNav } from "@/components/organizer/organizer-bottom-nav";
import { OrganizerHeaderSearch } from "@/components/organizer/OrganizerHeaderSearch";
import { HeaderNotificationBell } from "@/components/shared/header/HeaderNotificationBell";
import { HeaderProfileAvatar } from "@/components/shared/header/HeaderProfileAvatar";
import { UserAvatar } from "@/components/shared/user-avatar";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ORGANIZER_PORTAL_NAV = [
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

export function OrganizerPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [liveAvatar, setLiveAvatar] = useState<string | null | undefined>(
    session?.user?.image
  );

  useEffect(() => {
    if (session?.user?.image) {
      setLiveAvatar(session.user.image);
    }
  }, [session?.user?.image]);

  useEffect(() => {
    function handlePhotoUpdate(e: Event) {
      const customEvent = e as CustomEvent<{ photoUrl: string | null }>;
      setLiveAvatar(customEvent.detail?.photoUrl);
    }
    window.addEventListener("notari:profile-photo-updated", handlePhotoUpdate);
    return () => window.removeEventListener("notari:profile-photo-updated", handlePhotoUpdate);
  }, []);

  const orgName = session?.user?.name || "Campus Org";

  return (
    <div className="min-h-screen bg-notari-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 sticky top-0 h-screen select-none shrink-0">
        <div className="space-y-6">
          <div className="px-2">
            <NotariLogo variant="organizer" />
          </div>

          <nav className="space-y-1">
            {ORGANIZER_PORTAL_NAV.map((item) => {
              const isActive =
                item.href === "/organizer"
                  ? pathname === "/organizer"
                  : item.href === "/organizer/events/create"
                  ? pathname === "/organizer/events/create"
                  : item.href === "/organizer/events"
                  ? pathname.startsWith("/organizer/events") && pathname !== "/organizer/events/create"
                  : pathname === item.href || (item.href !== "/organizer" && pathname.startsWith(item.href));
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
            <UserAvatar
              src={liveAvatar || session?.user?.image}
              name={orgName}
              size="md"
              variant="organizer"
            />
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

            {/* Search Bar with live search dropdown */}
            <div className="hidden sm:flex items-center">
              <OrganizerHeaderSearch />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link href="/organizer/events/create">
              <button className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-sm transition-all cursor-pointer">
                <PlusCircle className="w-4 h-4" />
                <span>New Event</span>
              </button>
            </Link>
            <HeaderNotificationBell variant="organizer" />
            <HeaderProfileAvatar
              user={{
                id: session?.user?.id,
                name: orgName,
                email: session?.user?.email,
                role: "organizer",
                isOrganizer: true,
                image: liveAvatar || session?.user?.image,
              }}
              variant="organizer"
            />
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
