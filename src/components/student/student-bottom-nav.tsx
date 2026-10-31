"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Ticket, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils";

const STUDENT_BOTTOM_NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/student",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "My Events",
    href: "/student/my-events",
    icon: Calendar,
    exact: false,
  },
  {
    name: "My Tickets",
    href: "/student/tickets",
    icon: Ticket,
    exact: false,
  },
  {
    name: "Saved",
    href: "/student/saved",
    icon: Bookmark,
    exact: false,
  },
  {
    name: "Profile",
    href: "/student/settings",
    icon: User,
    exact: false,
  },
];

export function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Student Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(16,28,58,0.06)] pb-safe transition-all select-none"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {STUDENT_BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) ||
              (item.href === "/student/my-events" && pathname === "/student/events");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1.5 h-full min-w-0 transition-colors relative group",
                isActive ? "text-notari-primary" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {/* Active subtle pill bar at top */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-notari-primary rounded-b-full shadow-sm shadow-indigo-500/30" />
              )}

              <div
                className={cn(
                  "p-1 rounded-xl transition-all",
                  isActive ? "bg-indigo-50/80 text-notari-primary scale-105" : "group-hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>

              <span
                className={cn(
                  "text-[10px] tracking-tight truncate mt-0.5",
                  isActive ? "font-bold text-notari-primary" : "font-medium text-slate-500"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
