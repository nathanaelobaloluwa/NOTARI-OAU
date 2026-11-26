"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotariLogo } from "@/components/shared/notari-logo";
import { StudentBottomNav } from "@/components/student/student-bottom-nav";
import { HeaderNotificationBell } from "@/components/shared/header/HeaderNotificationBell";
import { HeaderProfileAvatar } from "@/components/shared/header/HeaderProfileAvatar";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  LayoutDashboard,
  Compass,
  Calendar,
  Ticket,
  History,
  Bookmark,
  Settings,
  LogOut,
  Search,
  Building,
  PlusCircle,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const STUDENT_PORTAL_NAV = [
  { name: "Dashboard", href: "/student", icon: LayoutDashboard },
  { name: "Explore Events", href: "/events", icon: Compass },
  { name: "My Tickets", href: "/student/tickets", icon: Ticket },
  { name: "My Events", href: "/student/my-events", icon: Calendar },
  { name: "Announcements", href: "/student/announcements", icon: Megaphone },
  { name: "Saved Events", href: "/student/saved", icon: Bookmark },
  { name: "Event History", href: "/student/history", icon: History },
  { name: "Profile & Settings", href: "/student/settings", icon: Settings },
];

export function StudentPortalShell({
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

  const studentName = session?.user?.name || "Student";

  return (
    <div className="min-h-screen bg-notari-bg flex">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 sticky top-0 h-screen select-none shrink-0">
        <div className="space-y-6">
          <div className="px-2">
            <NotariLogo variant="student" />
          </div>

          <nav className="space-y-1">
            {STUDENT_PORTAL_NAV.map((item) => {
              const isActive =
                item.href === "/student"
                  ? pathname === "/student"
                  : pathname === item.href || (item.href === "/events" && pathname.startsWith("/events"));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-notari-primary text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-notari-dark"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {session?.user?.isOrganizer ? (
              <Link
                href="/organizer"
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mt-3 border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
              >
                <div className="flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Organizer Portal</span>
                </div>
                <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-md font-bold">
                  Active
                </span>
              </Link>
            ) : (
              <Link
                href="/student/organizer-apply"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mt-3 border",
                  pathname === "/student/organizer-apply"
                    ? "bg-notari-primary text-white shadow-sm border-notari-primary"
                    : "border-indigo-100 bg-indigo-50/60 text-notari-primary hover:bg-indigo-50"
                )}
              >
                <PlusCircle className="w-4 h-4 text-notari-primary shrink-0" />
                <span>Become an Organizer</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User Card at Bottom of Sidebar */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <UserAvatar
              src={liveAvatar || session?.user?.image}
              name={studentName}
              size="md"
              variant="student"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-notari-dark truncate">{studentName}</span>
              <span className="text-[11px] text-slate-400 truncate">{session?.user?.email || "Student • OAU"}</span>
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Dashboard App-Style Header Logo */}
            <div className="lg:hidden shrink-0">
              <NotariLogo variant="student" />
            </div>

            {/* Desktop Search Bar */}
            <div className="relative hidden sm:flex items-center w-64 md:w-80">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events or tickets..."
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {session?.user?.isOrganizer ? (
              <Link
                href="/organizer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold border border-purple-200 transition-colors"
              >
                <Building className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Organizer Dashboard</span>
                <span className="sm:hidden">Organizer</span>
              </Link>
            ) : (
              <Link
                href="/student/organizer-apply"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-notari-primary hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5 text-notari-primary" />
                <span>Host an Event</span>
              </Link>
            )}

            <Link href="/events" className="hidden sm:inline-block text-xs font-semibold text-slate-600 hover:text-notari-primary hover:underline">
              Explore Events
            </Link>
            <HeaderNotificationBell variant="student" />
            <HeaderProfileAvatar
              user={{
                id: session?.user?.id,
                name: studentName,
                email: session?.user?.email,
                role: "student",
                isOrganizer: Boolean(session?.user?.isOrganizer),
                image: liveAvatar || session?.user?.image,
              }}
              variant="student"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <StudentBottomNav />
      </div>
    </div>
  );
}
