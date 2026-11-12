"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  SlidersHorizontal,
} from "lucide-react";

interface EmailDeliveryItem {
  id: string;
  recipient: string;
  subject: string;
  template: string;
  status: "pending" | "sent" | "failed" | "simulated" | "retry_scheduled" | "bounced";
  provider: "resend" | "simulated" | "mock";
  providerMessageId?: string;
  relatedType?: string;
  relatedId?: string;
  error?: string;
  retryCount: number;
  lastAttemptAt: string;
  createdAt: string;
}

interface DeliverySummary {
  total: number;
  sent: number;
  failed: number;
  simulated: number;
}

export function AdminEmailDeliveriesClient() {
  const [deliveries, setDeliveries] = useState<EmailDeliveryItem[]>([]);
  const [summary, setSummary] = useState<DeliverySummary>({
    total: 0,
    sent: 0,
    failed: 0,
    simulated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        status: statusFilter,
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/admin/email-deliveries?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setDeliveries(data.deliveries || []);
        if (data.summary) setSummary(data.summary);
        if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch email deliveries:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDeliveries();
  };

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/email-deliveries/${deliveryId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: "success",
          message: data.message || "Email delivery re-dispatched successfully.",
        });
        await fetchDeliveries();
      } else {
        setActionFeedback({
          type: "error",
          message: data.message || "Failed to retry email delivery.",
        });
      }
    } catch {
      setActionFeedback({
        type: "error",
        message: "Network error occurred while attempting retry.",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Sent (Resend)</span>
          </span>
        );
      case "simulated":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3 text-blue-600" />
            <span>Simulated</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </span>
        );
      case "retry_scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 text-amber-600" />
            <span>Retry Scheduled</span>
          </span>
        );
      case "bounced":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="w-3 h-3 text-slate-600" />
            <span>Bounced</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-notari-dark tracking-tight">
            Transactional Email Deliveries
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit log of all Resend transactional notifications, ticket deliveries, and failure traces.
          </p>
        </div>
        <button
          onClick={() => fetchDeliveries()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Notifications</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-notari-dark">{summary.total}</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Delivered via Resend</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-700">{summary.sent}</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Simulated (Dev/Test)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Send className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-blue-700">{summary.simulated}</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Failed Deliveries</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-rose-700">{summary.failed}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipient, subject, reference..."
            className="w-full h-9 pl-9 pr-4 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden cursor-pointer w-full md:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent via Resend</option>
            <option value="simulated">Simulated</option>
            <option value="failed">Failed</option>
            <option value="retry_scheduled">Retry Scheduled</option>
            <option value="pending">Pending</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Deliveries Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject & Template</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Error / Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading email delivery audit logs...</span>
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Mail className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No email delivery records found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Transactional emails will appear here as registrations and payments occur.
                    </p>
                  </td>
                </tr>
              ) : (
                deliveries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-notari-dark">
                      {item.recipient}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 truncate">{item.subject}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                        {item.template}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {item.relatedId || "—"}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {item.error ? (
                        <span className="text-rose-600 font-medium text-[11px] line-clamp-2" title={item.error}>
                          {item.error}
                        </span>
                      ) : item.providerMessageId ? (
                        <span className="text-slate-400 font-mono text-[10px]">
                          ID: {item.providerMessageId.substring(0, 16)}...
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {["failed", "pending", "retry_scheduled"].includes(item.status) &&
                      item.retryCount < 5 ? (
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-[11px] disabled:opacity-50 cursor-pointer transition-colors"
                          title="Retry sending this notification"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${retryingId === item.id ? "animate-spin" : ""}`}
                          />
                          <span>{retryingId === item.id ? "Retrying..." : "Retry"}</span>
                        </button>
                      ) : item.retryCount >= 5 ? (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Max retries (5)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
