"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import {
  Search,
  DollarSign,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface AdminBookingItem {
  id: string;
  reference: string;
  paystackReference: string | null;
  bookingReference: string | null;
  studentName: string;
  studentEmail: string;
  matricNumber: string | null;
  eventTitle: string;
  eventSlug: string;
  tierName: string;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  date: string;
}

interface AdminLedgerStats {
  platformGrossVolume: number;
  platformSuccessfulCount: number;
  platformPendingCount: number;
  totalTicketsSold: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AdminBookingsClient() {
  const [items, setItems] = useState<AdminBookingItem[]>([]);
  const [stats, setStats] = useState<AdminLedgerStats>({
    platformGrossVolume: 0,
    platformSuccessfulCount: 0,
    platformPendingCount: 0,
    totalTicketsSold: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchLedger = async (page = 1, status = activeStatus, q = debouncedSearch) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (status !== "all") params.set("status", status);
      if (q.trim()) params.set("search", q.trim());

      const response = await fetch(`/api/admin/bookings?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to load platform ledger.");
        setIsLoading(false);
        return;
      }

      setItems(data.items || []);
      setStats(
        data.stats || {
          platformGrossVolume: 0,
          platformSuccessfulCount: 0,
          platformPendingCount: 0,
          totalTicketsSold: 0,
        }
      );
      setPagination(
        data.pagination || {
          page: 1,
          limit: 15,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      console.error("Error fetching admin ledger:", err);
      setErrorMessage("Network error occurred while fetching platform ledger.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(1, activeStatus, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, debouncedSearch]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Bookings & Transactions Ledger
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Superadmin platform-wide audit ledger of all campus bookings, Paystack payments, and gate
          admissions.
        </p>
      </div>

      {/* 2. Platform Revenue Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Platform Gross Volume</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#101C3A]">
            ₦{stats.platformGrossVolume.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">All verified transactions</p>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Successful Orders</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-notari-primary flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#101C3A]">
            {stats.platformSuccessfulCount}
          </div>
          <p className="text-[11px] text-slate-400">Confirmed purchases</p>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Tickets Issued</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#101C3A]">
            {stats.totalTicketsSold}
          </div>
          <p className="text-[11px] text-slate-400">Issued QR passes</p>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pending Transactions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-600">
            {stats.platformPendingCount}
          </div>
          <p className="text-[11px] text-slate-400">In checkout flow</p>
        </Card>
      </div>

      {/* 3. Search Bar & Status Filters */}
      <Card className="p-4 border-slate-200/80 bg-white shadow-xs space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, email, or payment reference..."
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {[
            { label: "All Statuses", value: "all" },
            { label: "Successful", value: "successful" },
            { label: "Pending", value: "pending" },
            { label: "Failed", value: "failed" },
            { label: "Abandoned", value: "abandoned" },
            { label: "Reconciliation Needed", value: "reconciliation_needed" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeStatus === tab.value
                  ? "bg-[#101C3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* 4. Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 5. Table / Cards */}
      {isLoading ? (
        <Card className="p-12 border-slate-200/80 bg-white text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#101C3A] mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Querying platform ledger...</p>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-12 border-slate-200/80 bg-white text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#101C3A]">No transaction records found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No payments or bookings match the selected filters or search query.
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="space-y-3 md:hidden">
            {items.map((b) => (
              <Card key={b.id} className="p-4 border-slate-200/80 bg-white shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#101C3A] block">
                      {b.reference}
                    </span>
                    <span className="text-xs text-slate-700 font-medium">{b.studentName}</span>
                    <span className="text-[11px] text-slate-400 block">{b.studentEmail}</span>
                  </div>
                  <StatusPill status={b.status} />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="text-slate-800 font-semibold truncate">{b.eventTitle}</p>
                    <span className="text-[11px] text-slate-400">
                      {b.quantity}x {b.tierName}
                    </span>
                  </div>
                  <span className="font-bold text-sm text-[#101C3A] shrink-0">
                    ₦{b.amount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>
                    {new Date(b.date).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {b.bookingReference && (
                    <span className="font-mono text-slate-500">Book: {b.bookingReference}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <Card className="hidden md:block p-6 border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Tier</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="py-3 font-mono font-bold text-[#101C3A]">{b.reference}</td>
                      <td className="py-3">
                        <div className="font-bold text-[#101C3A]">{b.studentName}</div>
                        <div className="text-[11px] text-slate-400">{b.studentEmail}</div>
                      </td>
                      <td className="py-3 font-medium text-slate-700 max-w-[180px] truncate">
                        {b.eventTitle}
                      </td>
                      <td className="py-3 text-slate-600">{b.tierName}</td>
                      <td className="py-3 font-bold text-slate-700">{b.quantity}</td>
                      <td className="py-3 font-extrabold text-[#101C3A]">
                        ₦{b.amount.toLocaleString()}
                      </td>
                      <td className="py-3">
                        <StatusPill status={b.status} />
                      </td>
                      <td className="py-3 text-slate-400 whitespace-nowrap">
                        {new Date(b.date).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Page <strong>{pagination.page}</strong> of{" "}
                  <strong>{pagination.totalPages}</strong> ({pagination.total} total transactions)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchLedger(pagination.page - 1)}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Prev</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchLedger(pagination.page + 1)}
                    className="h-8 px-2.5 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
