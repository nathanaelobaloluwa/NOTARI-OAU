"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import {
  DollarSign,
  Ticket,
  Clock,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

interface OrderItem {
  id: string;
  reference: string;
  studentName: string;
  studentEmail: string;
  matricNumber?: string | null;
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

interface OrderStats {
  totalRevenue: number;
  pendingRevenue: number;
  totalTicketsSold: number;
  successfulOrdersCount: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function OrganizerOrdersClient() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalRevenue: 0,
    pendingRevenue: 0,
    totalTicketsSold: 0,
    successfulOrdersCount: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async (page = 1, status = activeStatus) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const url = `/api/organizer/orders?page=${page}&limit=15${
        status !== "all" ? `&status=${status}` : ""
      }`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to load orders.");
        setIsLoading(false);
        return;
      }

      setOrders(data.orders || []);
      setStats(
        data.stats || {
          totalRevenue: 0,
          pendingRevenue: 0,
          totalTicketsSold: 0,
          successfulOrdersCount: 0,
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
      console.error("Error fetching orders:", err);
      setErrorMessage("Network error occurred while fetching your orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, activeStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Orders & Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time verified Paystack transactions and attendee ticket orders for your events.
          </p>
        </div>

        <Link href="/organizer/payouts">
          <Button variant="outline" className="rounded-xl h-10 text-xs font-semibold gap-1.5 shadow-xs">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Revenue & Payouts</span>
          </Button>
        </Link>
      </div>

      {/* 2. Metrics Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Gross Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-notari-dark">
            ₦{stats.totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">Confirmed sales</p>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Paid Orders</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-notari-primary flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-notari-dark">
            {stats.successfulOrdersCount}
          </div>
          <p className="text-[11px] text-slate-400">Completed purchases</p>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Tickets Sold</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-notari-dark">
            {stats.totalTicketsSold}
          </div>
          <p className="text-[11px] text-slate-400">Issued digital passes</p>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Pending Checkout</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-600">
            ₦{stats.pendingRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">Awaiting clearance</p>
        </Card>
      </div>

      {/* 3. Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: "All Orders", value: "all" },
          { label: "Successful", value: "successful" },
          { label: "Pending", value: "pending" },
          { label: "Failed / Expired", value: "failed" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveStatus(tab.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeStatus === tab.value
                ? "bg-notari-primary text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 5. Orders List / Table */}
      {isLoading ? (
        <Card className="p-12 border-slate-200/80 bg-white text-center">
          <Loader2 className="w-8 h-8 animate-spin text-notari-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading transactions...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 border-slate-200/80 bg-white text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-notari-dark">No orders found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeStatus === "all"
              ? "You haven't received any paid ticket purchases for your events yet."
              : `No orders matching status '${activeStatus}'.`}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="space-y-3 md:hidden">
            {orders.map((o) => (
              <Card key={o.id} className="p-4 border-slate-200/80 bg-white shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-notari-dark block">
                      {o.reference}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">{o.studentName}</span>
                    {o.matricNumber && (
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {o.matricNumber}
                      </span>
                    )}
                  </div>
                  <StatusPill status={o.status} />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="text-slate-800 font-semibold truncate">{o.eventTitle}</p>
                    <span className="text-[11px] text-slate-500">
                      {o.quantity}x {o.tierName}
                    </span>
                  </div>
                  <span className="font-extrabold text-sm text-notari-dark shrink-0">
                    ₦{o.amount.toLocaleString()}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 pt-1">
                  {new Date(o.date).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <Card className="hidden md:block p-6 border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Student Name</th>
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Tier</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-mono font-bold text-notari-dark">{o.reference}</td>
                      <td className="py-3">
                        <div className="font-medium text-slate-800">{o.studentName}</div>
                        <div className="text-[11px] text-slate-400">{o.studentEmail}</div>
                      </td>
                      <td className="py-3 font-medium text-slate-700 max-w-[180px] truncate">
                        {o.eventTitle}
                      </td>
                      <td className="py-3 text-slate-600">{o.tierName}</td>
                      <td className="py-3 font-bold text-slate-700">{o.quantity}</td>
                      <td className="py-3 font-extrabold text-notari-dark">
                        ₦{o.amount.toLocaleString()}
                      </td>
                      <td className="py-3 text-slate-400 whitespace-nowrap">
                        {new Date(o.date).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <StatusPill status={o.status} />
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
                  Showing page <strong>{pagination.page}</strong> of{" "}
                  <strong>{pagination.totalPages}</strong> ({pagination.total} orders)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchOrders(pagination.page - 1)}
                    className="h-8 px-2.5 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Prev</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchOrders(pagination.page + 1)}
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
