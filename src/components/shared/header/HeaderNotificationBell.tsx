"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Check,
  Ticket,
  CreditCard,
  Award,
  Calendar,
  DollarSign,
  RefreshCcw,
  Megaphone,
  Loader2,
  Sparkles,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface HeaderNotificationBellProps {
  variant?: "student" | "organizer" | "admin";
  className?: string;
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recent";
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "ticket":
      return <Ticket className="w-4 h-4 text-indigo-600" />;
    case "payment":
      return <CreditCard className="w-4 h-4 text-emerald-600" />;
    case "application":
      return <Award className="w-4 h-4 text-purple-600" />;
    case "event":
      return <Calendar className="w-4 h-4 text-blue-600" />;
    case "payout":
      return <DollarSign className="w-4 h-4 text-amber-600" />;
    case "refund":
      return <RefreshCcw className="w-4 h-4 text-rose-600" />;
    case "announcement":
      return <Megaphone className="w-4 h-4 text-amber-600" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500" />;
  }
}

export function HeaderNotificationBell({
  variant = "student",
  className = "",
}: HeaderNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setNotifications(data.items);
          setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
        }
      }
    } catch {
      // Silently catch network interruption
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds when idle
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside & Escape key listeners
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

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch {
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
    } catch {
      fetchNotifications();
    }
  };

  const getBadgeColor = () => {
    if (variant === "organizer") return "bg-purple-600";
    if (variant === "admin") return "bg-rose-500";
    return "bg-indigo-600";
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 sm:p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-notari-primary/30"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full ${getBadgeColor()} text-[10px] font-extrabold text-white flex items-center justify-center shadow-xs animate-in zoom-in-75`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="User notifications"
          className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-notari-dark tracking-tight">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100/80 text-notari-primary text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-notari-primary hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-notari-dark">You&apos;re all caught up!</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-[220px] mx-auto">
                    New event tickets, payments, and approvals will appear here.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 px-4 transition-colors flex items-start gap-3 text-left ${
                    item.isRead
                      ? "bg-white hover:bg-slate-50/70"
                      : "bg-indigo-50/30 hover:bg-indigo-50/50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/50">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs truncate ${
                          item.isRead
                            ? "font-semibold text-slate-700"
                            : "font-bold text-notari-dark"
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>

                    {item.linkUrl && (
                      <Link
                        href={item.linkUrl}
                        onClick={() => {
                          if (!item.isRead) handleMarkAsRead(item.id);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-notari-primary hover:underline mt-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>View details</span>
                      </Link>
                    )}
                  </div>

                  {!item.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      title="Mark as read"
                      className="p-1 rounded-md text-slate-400 hover:text-notari-primary hover:bg-slate-200/60 shrink-0 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
