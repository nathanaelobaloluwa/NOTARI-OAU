"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  User,
  Ticket,
  Calendar,
  Bookmark,
  Settings,
  LogOut,
  ShieldCheck,
  Building,
  DollarSign,
  QrCode,
  Compass,
  FileCheck2,
} from "lucide-react";

export interface HeaderUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  isOrganizer?: boolean;
  image?: string | null;
}

interface HeaderProfileAvatarProps {
  user?: HeaderUser;
  variant?: "student" | "organizer" | "admin";
  className?: string;
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function HeaderProfileAvatar({
  user,
  variant = "student",
  className = "",
}: HeaderProfileAvatarProps) {
  const { data: clientSession } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const name = user?.name || clientSession?.user?.name || "Student User";
  const email = user?.email || clientSession?.user?.email || "student@notari.oau.edu.ng";
  const role = user?.role || (clientSession?.user as { role?: string })?.role || "student";
  const isOrganizer = Boolean(
    user?.isOrganizer ||
      (clientSession?.user as { isOrganizer?: boolean })?.isOrganizer ||
      role === "organizer"
  );
  const activeImage = user?.image || clientSession?.user?.image;

  // Destination for profile/settings link
  const profileHref =
    role === "admin"
      ? "/admin/settings"
      : role === "organizer" || isOrganizer
      ? "/organizer/profile"
      : "/student/settings";

  // Close on click outside & Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/login" });
    } catch {
      window.location.href = "/login";
    }
  };

  const getRoleBadge = () => {
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
          <ShieldCheck className="w-3 h-3 text-blue-600" />
          <span>Superadmin</span>
        </span>
      );
    }
    if (role === "organizer" || isOrganizer) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
          <Building className="w-3 h-3 text-purple-600" />
          <span>Organizer</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-notari-primary bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
        <User className="w-3 h-3 text-notari-primary" />
        <span>Student</span>
      </span>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-notari-primary/30"
        aria-label="User account menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <UserAvatar
          src={activeImage}
          name={name}
          size="sm"
          variant={variant}
          className="w-8 h-8 sm:w-9 sm:h-9"
        />
      </button>

      {/* Account Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="User account options"
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Profile Card - Clickable Link to Profile/Settings */}
          <Link
            href={profileHref}
            onClick={() => setIsOpen(false)}
            className="p-4 bg-slate-50/80 hover:bg-slate-100/90 transition-colors border-b border-slate-100 block space-y-2 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                src={activeImage}
                name={name}
                size="md"
                variant={variant}
                className="w-10 h-10 shrink-0 group-hover:ring-2 group-hover:ring-notari-primary/30 transition-all"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-notari-dark group-hover:text-notari-primary transition-colors truncate">
                    {name}
                  </h4>
                  <span className="text-[10px] text-slate-400 group-hover:text-notari-primary transition-colors font-medium">
                    Profile &rarr;
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{email}</p>
              </div>
            </div>
            <div className="pt-1">{getRoleBadge()}</div>
          </Link>

          {/* Role-Specific Navigation Menu Items */}
          <div className="p-2 space-y-0.5 text-xs">
            {/* Student Links */}
            {(role === "student" || variant === "student") && (
              <>
                <Link
                  href="/student/tickets"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Ticket className="w-4 h-4 text-indigo-600" />
                  <span>My Passes & Tickets</span>
                </Link>

                <Link
                  href="/student/history"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Booking History</span>
                </Link>

                <Link
                  href="/student/saved"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Bookmark className="w-4 h-4 text-amber-500" />
                  <span>Saved Events</span>
                </Link>

                {isOrganizer ? (
                  <Link
                    href="/organizer"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-purple-700 hover:bg-purple-50 font-semibold transition-colors"
                  >
                    <Building className="w-4 h-4 text-purple-600" />
                    <span>Switch to Organizer Hub</span>
                  </Link>
                ) : (
                  <Link
                    href="/student/organizer-apply"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-purple-700 hover:bg-purple-50 font-semibold transition-colors"
                  >
                    <Building className="w-4 h-4 text-purple-600" />
                    <span>Host Events at OAU</span>
                  </Link>
                )}

                <Link
                  href="/student/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Account Settings</span>
                </Link>
              </>
            )}

            {/* Organizer Links */}
            {(role === "organizer" || variant === "organizer") && (
              <>
                <Link
                  href="/organizer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Compass className="w-4 h-4 text-purple-600" />
                  <span>Organizer Dashboard</span>
                </Link>

                <Link
                  href="/organizer/events"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>My Events</span>
                </Link>

                <Link
                  href="/organizer/orders"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Ticket className="w-4 h-4 text-indigo-600" />
                  <span>Ticket Sales & Orders</span>
                </Link>

                <Link
                  href="/organizer/payouts"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Payouts & Revenue</span>
                </Link>

                <Link
                  href="/organizer/check-in"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Gate Check-in Scanner</span>
                </Link>

                <Link
                  href="/organizer/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Building className="w-4 h-4 text-slate-500" />
                  <span>Organizer Profile</span>
                </Link>

                <Link
                  href="/student"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors"
                >
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Switch to Student View</span>
                </Link>
              </>
            )}

            {/* Admin Links */}
            {(role === "admin" || variant === "admin") && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Superadmin Control Hub</span>
                </Link>

                <Link
                  href="/admin/approvals"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <FileCheck2 className="w-4 h-4 text-amber-600" />
                  <span>Approvals Queue</span>
                </Link>

                <Link
                  href="/admin/financial"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Financial & Payouts</span>
                </Link>

                <Link
                  href="/admin/events"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>All Events Directory</span>
                </Link>

                <Link
                  href="/admin/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-notari-dark hover:bg-slate-100/80 font-medium transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Platform Settings</span>
                </Link>
              </>
            )}
          </div>

          {/* Universal Sign Out Action */}
          <div className="p-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer text-xs"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
