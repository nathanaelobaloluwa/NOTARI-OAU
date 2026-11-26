"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotariLogo } from "@/components/shared/notari-logo";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { HeaderNotificationBell } from "@/components/shared/header/HeaderNotificationBell";
import { HeaderProfileAvatar } from "@/components/shared/header/HeaderProfileAvatar";
import { UserAvatar } from "@/components/shared/user-avatar";
import { MOCK_PENDING_APPROVALS } from "@/lib/mock-data";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Ticket,
  DollarSign,
  Users,
  Building,
  UserCheck,
  Megaphone,
  BarChart2,
  Mail,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pendingApprovalsCount = MOCK_PENDING_APPROVALS.length;

export const ADMIN_PORTAL_NAV = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Events", href: "/admin/events", icon: Calendar },
  {
    name: "Approvals",
    href: "/admin/approvals",
    icon: CheckSquare,
    badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
  },
  { name: "Bookings", href: "/admin/bookings", icon: Ticket },
  { name: "Financial & Payouts", href: "/admin/financial", icon: DollarSign },
  { name: "Attendees", href: "/admin/attendees", icon: Users },
  { name: "Organizers", href: "/admin/organizers", icon: Building },
  { name: "Users", href: "/admin/users", icon: UserCheck },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "Reports & Analytics", href: "/admin/analytics", icon: BarChart2 },
  { name: "Email Deliveries", href: "/admin/email-deliveries", icon: Mail },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminName = session?.user?.name || "Admin";

  return (
    <div className="min-h-screen bg-notari-bg flex">
      {/* Dark Navy Sidebar */}
      <aside className="hidden xl:flex w-64 flex-col justify-between bg-[#151C35] text-white p-5 sticky top-0 h-screen select-none shadow-xl z-40 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="px-2">
            <NotariLogo variant="admin" isDark />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {ADMIN_PORTAL_NAV.map((item) => {
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
              <UserAvatar
                src={session?.user?.image}
                name={adminName}
                size="sm"
                variant="admin"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{adminName}</span>
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile / Tablet Logo */}
            <div className="xl:hidden shrink-0">
              <NotariLogo variant="admin" />
            </div>

            {/* Quick Global Search Bar */}
            <div className="relative hidden md:flex items-center w-72">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, organizers, tickets..."
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <HeaderNotificationBell variant="admin" />
            <HeaderProfileAvatar
              user={{
                id: session?.user?.id,
                name: adminName,
                email: session?.user?.email,
                role: "admin",
                isOrganizer: false,
                image: session?.user?.image,
              }}
              variant="admin"
            />
          </div>
        </header>

        {/* Dashboard Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 xl:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <AdminBottomNav onOpenMenu={() => setMobileMenuOpen(true)} pendingApprovalsCount={pendingApprovalsCount} />

        {/* Mobile Slide-over Drawer Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#151C35] text-white p-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <NotariLogo variant="admin" isDark />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                {ADMIN_PORTAL_NAV.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all",
                        isActive
                          ? "bg-blue-600 text-white"
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

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
