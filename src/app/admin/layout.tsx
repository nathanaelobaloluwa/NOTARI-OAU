"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NotariLogo } from "@/components/shared/notari-logo";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Ticket,
  Users,
  Building,
  UserCheck,
  Megaphone,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Events", href: "/admin/events", icon: Calendar },
  { name: "Approvals", href: "/admin/approvals", icon: CheckSquare, badge: "5" },
  { name: "Bookings", href: "/admin/bookings", icon: Ticket },
  { name: "Attendees", href: "/admin/attendees", icon: Users },
  { name: "Organizers", href: "/admin/organizers", icon: Building },
  { name: "Users", href: "/admin/users", icon: UserCheck },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "Reports & Analytics", href: "/admin/analytics", icon: BarChart2 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FC] flex">
      {/* Dark Navy Sidebar */}
      <aside className="hidden xl:flex w-64 flex-col justify-between bg-[#0B132B] text-white p-5 sticky top-0 h-screen select-none shadow-xl z-40">
        <div className="space-y-6">
          {/* Logo */}
          <div className="px-2">
            <NotariLogo variant="admin" isDark />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin User Profile at Bottom of Sidebar */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-400/20">
                AD
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">Admin</span>
                <span className="text-[10px] text-slate-400 truncate">Super Administrator</span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors w-full text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="xl:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, users, organizers, or anything..."
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-xs text-notari-dark placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          {/* Top Right Utilities */}
          <div className="flex items-center gap-4">
            {/* Notification Bell with Badge 5 */}
            <button className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                5
              </span>
            </button>

            {/* Dark / Light Toggle */}
            <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <Moon className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>

            <div className="h-5 w-px bg-slate-200" />

            {/* Admin Avatar */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20">
                AD
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-notari-dark">Admin</span>
                <span className="text-[10px] text-slate-400">Super Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex xl:hidden">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-[#0B132B] text-white p-5 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <NotariLogo variant="admin" isDark />
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-5 h-5 text-slate-400 hover:text-white" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all",
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 rounded-lg hover:bg-rose-500/10 w-full text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 xl:pb-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <AdminBottomNav onOpenMenu={() => setMobileMenuOpen(true)} pendingApprovalsCount={5} />
      </div>
    </div>
  );
}
