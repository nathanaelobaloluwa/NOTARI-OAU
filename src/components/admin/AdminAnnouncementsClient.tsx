"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  XCircle,
  Send,
  Users,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Pin,
  Mail,
  Bell,
} from "lucide-react";
import { ANNOUNCEMENT_CATEGORIES } from "@/models/Announcement";
import { OAU_FACULTIES, formatFacultyLabel } from "@/constants/oau";

interface TargetAudience {
  type: string;
  faculty?: string;
  department?: string;
  level?: string;
  eventId?: string;
}

interface NotificationStats {
  inAppSentCount: number;
  emailsQueuedCount: number;
  emailsDeliveredCount: number;
  emailsFailedCount: number;
}

interface AnnouncementItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "draft" | "pending_review" | "approved" | "scheduled" | "published" | "archived" | "rejected";
  targetAudience: TargetAudience;
  authorName?: string;
  authorRole: string;
  scheduledFor?: string;
  publishedAt?: string;
  expiresAt?: string;
  isPinned: boolean;
  notificationStats: NotificationStats;
  readCount: number;
  rejectionReason?: string;
  createdAt: string;
}

interface AnnouncementStats {
  totalAnnouncements: number;
  published: number;
  scheduled: number;
  draft: number;
  pendingReview: number;
  archived: number;
  notifications: {
    inAppTotal: number;
    emailsQueuedTotal: number;
    emailsDeliveredTotal: number;
    emailsFailedTotal: number;
  };
}

const CATEGORY_NAMES: Record<string, string> = {
  general_news: "Campus News",
  academic_updates: "Academic Updates",
  student_affairs: "Student Affairs",
  faculty_announcements: "Faculty Notice",
  departmental_updates: "Departmental Update",
  campus_events: "Campus Event",
  emergency_notices: "Emergency Notice",
  opportunities: "Opportunity",
  scholarships_competitions: "Scholarships",
};



const ACADEMIC_LEVELS = ["100", "200", "300", "400", "500", "Postgraduate"];

export function AdminAnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [stats, setStats] = useState<AnnouncementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general_news");
  const [formPriority, setFormPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [formAudienceType, setFormAudienceType] = useState<string>("all_students");
  const [formFaculty, setFormFaculty] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formLevel, setFormLevel] = useState("");
  const [formPublishMode, setFormPublishMode] = useState<"publish" | "draft" | "schedule">("publish");
  const [formScheduledDate, setFormScheduledDate] = useState("");
  const [formIsPinned, setFormIsPinned] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/announcements/stats");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setStats(json.stats);
      }
    } catch (err) {
      console.error("Failed to load announcement stats", err);
    }
  };

  const fetchAnnouncements = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/announcements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAnnouncements(json.announcements);
          setTotalPages(json.pagination.totalPages);
          setTotalCount(json.pagination.total);
        }
      }
    } catch (err) {
      console.error("Failed to fetch announcements", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, statusFilter, categoryFilter, priorityFilter, search]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSummary.trim() || !formContent.trim()) {
      showToast("Please fill in all required announcement fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      let status = "draft";
      if (formPublishMode === "publish") status = "published";
      if (formPublishMode === "schedule") status = "scheduled";

      const payload = {
        title: formTitle.trim(),
        summary: formSummary.trim(),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        targetAudience: {
          type: formAudienceType,
          faculty: formAudienceType === "faculty" ? formFaculty : undefined,
          department: formAudienceType === "department" ? formDepartment : undefined,
          level: formAudienceType === "academic_level" ? formLevel : undefined,
        },
        status,
        scheduledFor: formPublishMode === "schedule" && formScheduledDate ? new Date(formScheduledDate).toISOString() : undefined,
        isPinned: formIsPinned,
      };

      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message || "Announcement created successfully.");
        setShowCreateModal(false);
        // Reset form
        setFormTitle("");
        setFormSummary("");
        setFormContent("");
        setFormScheduledDate("");
        setFormIsPinned(false);
        fetchStats();
        fetchAnnouncements();
      } else {
        showToast(json.message || "Failed to create announcement.");
      }
    } catch (err) {
      console.error("Error creating announcement", err);
      showToast("Network error creating announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewAction = async (announcementId: string, action: "approve" | "reject" | "archive") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/announcements/${announcementId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? rejectReason.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        setShowRejectModal(false);
        setRejectReason("");
        setShowDetailModal(false);
        fetchStats();
        fetchAnnouncements();
      } else {
        showToast(json.message || `Failed to ${action} announcement.`);
      }
    } catch (err) {
      console.error(`Error reviewing announcement`, err);
      showToast("Network error reviewing announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "urgent":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">URGENT</span>;
      case "high":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">HIGH</span>;
      case "low":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">NORMAL</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "published":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Live</span>;
      case "scheduled":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled</span>;
      case "pending_review":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Moderation</span>;
      case "rejected":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      case "archived":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1"><Archive className="w-3 h-3" /> Archived</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#1A2644] text-white px-4 py-3 rounded-xl shadow-xl border border-indigo-500/30 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] dark:text-white tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            Campus Announcements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Broadcast platform-wide updates, faculty bulletins, and automated event notifications to Great Ife students.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStats();
              fetchAnnouncements();
            }}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#131E3A] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Total Broadcasts</span>
              <Megaphone className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-[#101C3A] dark:text-white mt-2">
              {stats.totalAnnouncements}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Platform announcements</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#131E3A] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Published Live</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              {stats.published}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Currently active & visible</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#131E3A] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Scheduled</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
              {stats.scheduled}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Queued for automated release</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#131E3A] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Needs Review</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
              {stats.pendingReview}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Pending admin accreditation</div>
          </div>
        </div>
      )}

      {/* Notification Delivery Bar */}
      {stats && (
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-200">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Campus Notification Delivery Stats:</span>
          </div>
          <div className="flex items-center gap-6 text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{stats.notifications.inAppTotal}</span> in-app alerts delivered
            </div>
            <div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.notifications.emailsDeliveredTotal}</span> emails delivered
            </div>
            <div>
              <span className="font-semibold text-sky-600 dark:text-sky-400">{stats.notifications.emailsQueuedTotal}</span> emails queued
            </div>
            {stats.notifications.emailsFailedTotal > 0 && (
              <div>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{stats.notifications.emailsFailedTotal}</span> bounce/failed
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-[#131E3A] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, excerpt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter announcements by status"
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="published">Live / Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="pending_review">Pending Review</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter announcements by category"
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Categories</option>
            {ANNOUNCEMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_NAMES[cat] || cat}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter announcements by priority"
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white dark:bg-[#131E3A] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-4">Title & Excerpt</th>
                <th className="py-3 px-4">Target Audience</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Delivery</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading campus announcements...
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No campus announcements found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                announcements.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-start gap-2">
                        {a.isPinned && <Pin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-bold text-[#101C3A] dark:text-white line-clamp-1">{a.title}</div>
                          <div className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">{a.summary}</div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            By {a.authorName || "Administration"} • {new Date(a.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Users className="w-3 h-3 text-slate-400" />
                        {a.targetAudience.type === "all_students"
                          ? "All Students"
                          : a.targetAudience.type === "faculty"
                          ? `Faculty: ${a.targetAudience.faculty}`
                          : a.targetAudience.type === "department"
                          ? `Dept: ${a.targetAudience.department}`
                          : a.targetAudience.type === "academic_level"
                          ? `Level ${a.targetAudience.level}`
                          : "Event Attendees"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                      {CATEGORY_NAMES[a.category] || a.category}
                    </td>

                    <td className="py-3.5 px-4">{getPriorityBadge(a.priority)}</td>

                    <td className="py-3.5 px-4">{getStatusBadge(a.status)}</td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span title="In-App alerts" className="flex items-center gap-0.5">
                          <Bell className="w-3 h-3 text-indigo-400" />
                          {a.notificationStats?.inAppSentCount || 0}
                        </span>
                        <span title="Emails delivered" className="flex items-center gap-0.5 text-emerald-500">
                          <Mail className="w-3 h-3" />
                          {a.notificationStats?.emailsDeliveredCount || 0}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedAnnouncement(a);
                          setShowDetailModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
                      >
                        Inspect
                      </button>

                      {a.status === "pending_review" && (
                        <>
                          <button
                            onClick={() => handleReviewAction(a.id, "approve")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAnnouncement(a);
                              setShowRejectModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {a.status === "published" && (
                        <button
                          onClick={() => handleReviewAction(a.id, "archive")}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 text-xs font-semibold"
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
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
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131E3A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-[#101C3A] dark:text-white">Create Campus Announcement</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hezekiah Library Operating Hours During Harmattan Examinations"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Summary / Excerpt (Short description for notifications) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Brief summary appearing in notification alerts..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Announcement Content *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Detailed announcement content with instructions and context..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_NAMES[cat] || cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as "low" | "normal" | "high" | "urgent")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent (Safety / Emergency)</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Target Audience Selector */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block font-bold text-slate-700 dark:text-slate-300">Audience Targeting</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "all_students", label: "All Students" },
                    { id: "faculty", label: "Specific Faculty" },
                    { id: "department", label: "Specific Dept" },
                    { id: "academic_level", label: "Academic Level" },
                  ].map((aud) => (
                    <button
                      type="button"
                      key={aud.id}
                      onClick={() => setFormAudienceType(aud.id)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                        formAudienceType === aud.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>

                {formAudienceType === "faculty" && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Select Faculty</label>
                    <select
                      value={formFaculty}
                      onChange={(e) => setFormFaculty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Choose a Faculty...</option>
                      {OAU_FACULTIES.map((f) => (
                        <option key={f} value={f}>
                          {formatFacultyLabel(f)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formAudienceType === "department" && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Department Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science & Engineering"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    />
                  </div>
                )}

                {formAudienceType === "academic_level" && (
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Target Academic Level</label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Choose Level...</option>
                      {ACADEMIC_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl} Level
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Publication Option */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormPublishMode("publish")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                    formPublishMode === "publish"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-600"
                  }`}
                >
                  Publish Immediately
                </button>
                <button
                  type="button"
                  onClick={() => setFormPublishMode("schedule")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                    formPublishMode === "schedule"
                      ? "border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-600"
                  }`}
                >
                  Schedule Date & Time
                </button>
                <button
                  type="button"
                  onClick={() => setFormPublishMode("draft")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold ${
                    formPublishMode === "draft"
                      ? "border-slate-600 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      : "border-slate-200 dark:border-slate-800 text-slate-600"
                  }`}
                >
                  Save as Draft
                </button>
              </div>

              {formPublishMode === "schedule" && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Release Date & Time (UTC/WAT)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formScheduledDate}
                    onChange={(e) => setFormScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pinNotice"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="pinNotice" className="text-slate-700 dark:text-slate-300 font-medium">
                  Pin to top of student announcement bulletin
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Processing..." : formPublishMode === "publish" ? "Publish Announcement" : formPublishMode === "schedule" ? "Schedule Release" : "Save Draft"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT DETAIL MODAL */}
      {showDetailModal && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131E3A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedAnnouncement.status)}
                  {getPriorityBadge(selectedAnnouncement.priority)}
                </div>
                <h3 className="text-base font-bold text-[#101C3A] dark:text-white mt-1.5">
                  {selectedAnnouncement.title}
                </h3>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="font-semibold text-slate-500">Summary:</span>
                <p className="mt-1 text-slate-800 dark:text-slate-200">{selectedAnnouncement.summary}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500">Content:</span>
                <p className="mt-1 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.content}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div>
                  <span className="font-semibold text-slate-500">Target Audience:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedAnnouncement.targetAudience.type}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Author:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedAnnouncement.authorName || "Administration"} ({selectedAnnouncement.authorRole})
                  </div>
                </div>
              </div>

              {selectedAnnouncement.rejectionReason && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-rose-800 dark:text-rose-200">
                  <span className="font-bold">Rejection Reason:</span>
                  <p className="mt-1">{selectedAnnouncement.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131E3A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-base font-bold text-[#101C3A] dark:text-white">Reject Announcement</h3>
            <p className="text-xs text-slate-500 mt-1">
              Please provide feedback explaining why this announcement cannot be published to students.
            </p>

            <textarea
              rows={4}
              required
              placeholder="Explain reasons for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full mt-3 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={rejectReason.trim().length < 5 || isSubmitting}
                onClick={() => handleReviewAction(selectedAnnouncement.id, "reject")}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-40"
              >
                {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
