"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, CheckSquare, Ticket, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminBottomNavProps {
  onOpenMenu: () => void;
  pendingApprovalsCount?: number;
}

export function AdminBottomNav({ onOpenMenu, pendingApprovalsCount = 0 }: AdminBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Events",
      href: "/admin/events",
      icon: Calendar,
      exact: false,
    },
    {
      name: "Approvals",
      href: "/admin/approvals",
      icon: CheckSquare,
      exact: false,
      badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : null,
    },
    {
      name: "Bookings",
      href: "/admin/bookings",
      icon: Ticket,
      exact: false,
    },
  ];

  return (
    <nav
      aria-label="Admin Mobile Navigation"
      className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-t border-slate-800 text-white shadow-[0_-4px_25px_rgba(0,0,0,0.3)] pb-safe transition-all select-none"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1.5 h-full min-w-0 transition-colors relative group",
                isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-full shadow-sm shadow-blue-500/50" />
              )}

              <div
                className={cn(
                  "p-1 rounded-xl transition-all relative",
                  isActive ? "bg-blue-950/60 text-blue-400 scale-105 ring-1 ring-blue-500/30" : "group-hover:scale-105"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white ring-2 ring-[#0B132B]">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  "text-[10px] tracking-tight truncate mt-0.5",
                  isActive ? "font-bold text-blue-400" : "font-medium text-slate-400"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Drawer Trigger for All other admin tools */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex-1 flex flex-col items-center justify-center py-1.5 h-full min-w-0 text-slate-400 hover:text-slate-200 transition-colors group cursor-pointer"
          aria-label="Open full admin menu"
        >
          <div className="p-1 rounded-xl group-hover:scale-105 transition-all">
            <Menu className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[10px] tracking-tight font-medium text-slate-400 truncate mt-0.5">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
