"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone,
  Search,
  Filter,
  Calendar,
  Pin,
  Clock,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Users,
  AlertCircle,
  Bell,
  Check,
} from "lucide-react";
import { ANNOUNCEMENT_CATEGORIES } from "@/models/Announcement";

interface TargetAudience {
  type: string;
  faculty?: string;
  department?: string;
  level?: string;
  eventId?: string;
}

interface StudentAnnouncementItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  coverImage?: string;
  targetAudience: TargetAudience;
  publishedAt: string;
  authorName: string;
  authorRole: string;
  isPinned: boolean;
  isRead: boolean;
  tags?: string[];
}

const CATEGORY_NAMES: Record<string, string> = {
  general_news: "Campus News",
  academic_updates: "Academic Updates",
  student_affairs: "Student Affairs",
  faculty_announcements: "Faculty Notice",
  departmental_updates: "Departmental Update",
  campus_events: "Campus Event",
  emergency_notices: "Emergency Notice",
  opportunities: "Opportunities",
  scholarships_competitions: "Scholarships",
};

export function StudentAnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<StudentAnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Detail Modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<StudentAnnouncementItem | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "12");
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/student/announcements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAnnouncements(json.announcements);
          setTotalPages(json.pagination.totalPages);
          setTotalCount(json.pagination.total);
        }
      }
    } catch (err) {
      console.error("Failed to load student announcements", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, priorityFilter, search]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenAnnouncement = async (item: StudentAnnouncementItem) => {
    setSelectedAnnouncement(item);

    // If not read yet, mark as read on server
    if (!item.isRead) {
      try {
        await fetch(`/api/student/announcements/${item.id}/read`, { method: "POST" });
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, isRead: true } : a))
        );
      } catch (err) {
        console.error("Failed to mark announcement as read", err);
      }
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" /> URGENT
          </span>
        );
      case "high":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            HIGH PRIORITY
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">
            NOTICE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            GENERAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] dark:text-white tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            Campus Bulletins & Announcements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Official announcements, academic schedules, faculty notices, and important campus event alerts for Great Ife students.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131E3A] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search announcements by title, excerpt..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by announcement priority"
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent Only</option>
              <option value="high">High Priority</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => {
              setCategoryFilter("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
              categoryFilter === "all"
                ? "bg-indigo-600 text-white font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All Announcements
          </button>
          {ANNOUNCEMENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                categoryFilter === cat
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {CATEGORY_NAMES[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-white dark:bg-[#131E3A] border border-slate-200/80 dark:border-slate-800/80 p-5 animate-pulse"
            />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#131E3A] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-xs">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#101C3A] dark:text-white">No announcements found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            There are currently no announcements matching your filters. Check back soon for new campus updates!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              onClick={() => handleOpenAnnouncement(a)}
              className={`rounded-2xl bg-white dark:bg-[#131E3A] border transition-all hover:shadow-md cursor-pointer flex flex-col justify-between p-5 relative group ${
                a.isPinned
                  ? "border-indigo-400/80 dark:border-indigo-500/40 shadow-xs"
                  : !a.isRead
                  ? "border-blue-300/80 dark:border-blue-500/40 shadow-xs"
                  : "border-slate-200/80 dark:border-slate-800/80"
              }`}
            >
              <div>
                {/* Header row: Pin / Category / Unread pill */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    {a.isPinned && (
                      <span className="p-1 rounded-md bg-amber-500/10 text-amber-500" title="Pinned to top">
                        <Pin className="w-3 h-3" />
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {CATEGORY_NAMES[a.category] || a.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(a.priority)}
                    {!a.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shadow-xs" title="New unread announcement" />
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#101C3A] dark:text-white line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  {a.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mt-2 leading-relaxed">
                  {a.summary}
                </p>
              </div>

              {/* Footer row: Date & Author */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(a.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                  {a.authorName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 bg-white dark:bg-[#131E3A] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing page {page} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FULL ANNOUNCEMENT DETAIL MODAL */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131E3A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                    {CATEGORY_NAMES[selectedAnnouncement.category] || selectedAnnouncement.category}
                  </span>
                  {getPriorityBadge(selectedAnnouncement.priority)}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#101C3A] dark:text-white">
                  {selectedAnnouncement.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                  <span>Posted by <strong className="text-slate-700 dark:text-slate-300">{selectedAnnouncement.authorName}</strong></span>
                  <span>•</span>
                  <span>{new Date(selectedAnnouncement.publishedAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key Summary Callout */}
            <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-l-4 border-indigo-600 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {selectedAnnouncement.summary}
            </div>

            {/* Full Body Content */}
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap space-y-3 font-normal">
              {selectedAnnouncement.content}
            </div>

            {/* Actions */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Marked as read
              </span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
