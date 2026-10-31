"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Plus, QrCode, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const ORGANIZER_BOTTOM_NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/organizer",
    icon: LayoutDashboard,
    isAction: false,
    exact: true,
  },
  {
    name: "My Events",
    href: "/organizer/events",
    icon: Calendar,
    isAction: false,
    exact: false,
  },
  {
    name: "Create",
    href: "/organizer/events/create",
    icon: Plus,
    isAction: true,
    exact: false,
  },
  {
    name: "Check-In",
    href: "/organizer/check-in",
    icon: QrCode,
    isAction: false,
    exact: false,
  },
  {
    name: "Orders",
    href: "/organizer/orders",
    icon: DollarSign,
    isAction: false,
    exact: false,
  },
];

export function OrganizerBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Organizer Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(16,28,58,0.06)] pb-safe transition-all select-none"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2 relative">
        {ORGANIZER_BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center -mt-5 group"
                aria-label="Create New Event"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white shadow-lg shadow-purple-600/40 flex items-center justify-center ring-4 ring-white group-hover:scale-105 active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-purple-700 mt-1">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1.5 h-full min-w-0 transition-colors relative group",
                isActive ? "text-purple-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-purple-600 rounded-b-full shadow-sm shadow-purple-500/30" />
              )}

              <div
                className={cn(
                  "p-1 rounded-xl transition-all",
                  isActive ? "bg-purple-50 text-purple-600 scale-105" : "group-hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>

              <span
                className={cn(
                  "text-[10px] tracking-tight truncate mt-0.5",
                  isActive ? "font-bold text-purple-700" : "font-medium text-slate-500"
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
