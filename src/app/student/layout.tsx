"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotariLogo } from "@/components/shared/notari-logo";
import { StudentBottomNav } from "@/components/student/student-bottom-nav";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  History,
  Bookmark,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STUDENT_NAV = [
  { name: "Dashboard", href: "/student", icon: LayoutDashboard },
  { name: "My Events", href: "/student/my-events", icon: Calendar },
  { name: "My Tickets", href: "/student/tickets", icon: Ticket },
  { name: "Event History", href: "/student/history", icon: History },
  { name: "Saved Events", href: "/student/saved", icon: Bookmark },
  { name: "Profile & Settings", href: "/student/settings", icon: Settings },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const studentName = session?.user?.name || "Adeola Johnson";
  const studentInitials =
    studentName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AJ";

  return (
    <div className="min-h-screen bg-notari-bg flex">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-200 bg-white p-5 sticky top-0 h-screen select-none">
        <div className="space-y-6">
          <div className="px-2">
            <NotariLogo variant="student" />
          </div>

          <nav className="space-y-1">
            {STUDENT_NAV.map((item) => {
              const isActive = pathname === item.href;
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
          </nav>
        </div>

        {/* User Card at Bottom of Sidebar */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-notari-primary flex items-center justify-center font-bold text-sm">
              {studentInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-notari-dark truncate">{studentName}</span>
              <span className="text-[11px] text-slate-400 truncate">Student • OAU</span>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden sm:flex items-center w-80">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events or tickets..."
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/events" className="hidden sm:inline-block text-xs font-semibold text-notari-primary hover:underline">
              Discover Events
            </Link>
            <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
            </button>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-notari-primary flex items-center justify-center font-bold text-xs">
              {studentInitials}
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-72 bg-white p-5 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <NotariLogo variant="student" />
                  <button onClick={() => setMobileSidebarOpen(false)}>
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {STUDENT_NAV.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
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
                </nav>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 rounded-lg hover:bg-rose-50 w-full text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
