"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Clock,
  Info,
  ArrowRight,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface OrderStats {
  totalRevenue: number;
  pendingRevenue: number;
  totalTicketsSold: number;
  successfulOrdersCount: number;
}

export function OrganizerPayoutsClient() {
  const [stats, setStats] = useState<OrderStats>({
    totalRevenue: 0,
    pendingRevenue: 0,
    totalTicketsSold: 0,
    successfulOrdersCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/organizer/orders?page=1&limit=5");
        const data = await response.json();
        if (response.ok && data.success && data.stats) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Failed to load payout stats:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const platformFeeRate = 0; // Configurable platform commission; default zero per university policy
  const platformFees = stats.totalRevenue * platformFeeRate;
  const netProceeds = stats.totalRevenue - platformFees;

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Revenue & Payout Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track verified ticket revenues, platform settlement accounting, and disbursement records.
          </p>
        </div>

        <Link href="/organizer/orders">
          <Button variant="outline" className="rounded-xl h-10 text-xs font-semibold gap-1.5 shadow-xs">
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>

      {/* 2. Settlement Policy Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-notari-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-indigo-950">
          <p className="font-bold">Transparent Ledger & Settlement Protocol</p>
          <p className="leading-relaxed text-indigo-900/80">
            Ticket proceeds are collected securely via Paystack and recorded authoritatively in the
            NOTARI ledger. Direct bank disbursements are initiated following event conclusion according
            to OAU university financial regulations.
          </p>
        </div>
      </div>

      {/* 3. Metrics Cards */}
      {isLoading ? (
        <Card className="p-8 border-slate-200/80 bg-white text-center">
          <Loader2 className="w-6 h-6 animate-spin text-notari-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500">Calculating ledger balance...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Net Organizer Proceeds</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-notari-dark mt-1">
              ₦{netProceeds.toLocaleString()}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Recorded in ledger from {stats.successfulOrdersCount} order(s)
            </p>
          </Card>

          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Pending Checkout / Processing</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-600 mt-1">
              ₦{stats.pendingRevenue.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting final gateway clearance</p>
          </Card>

          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Gross Ticket Sales</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-notari-primary flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-notari-dark mt-1">
              ₦{stats.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.totalTicketsSold} tickets sold across all events
            </p>
          </Card>
        </div>
      )}

      {/* 4. Financial Breakdown Table */}
      <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-notari-dark uppercase tracking-wider">
          Financial Ledger Accounting
        </h3>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-600">Gross Ticket Volume</span>
            <span className="font-semibold text-notari-dark">
              ₦{stats.totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-600">Platform Commission (0%)</span>
            <span className="font-semibold text-slate-500">₦0.00</span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-600">Total Refunds Processed</span>
            <span className="font-semibold text-slate-500">₦0.00</span>
          </div>
          <div className="py-3 flex justify-between items-center text-sm">
            <span className="font-bold text-notari-dark">Total Net Balance</span>
            <span className="font-black text-emerald-600">
              ₦{netProceeds.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* 5. Disbursement Status */}
      <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-notari-dark uppercase tracking-wider">
            Settlement Account Status
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            Ledger-Only Phase
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Automated bank transfers and Paystack Subaccount splits will be linked during the upcoming
          financial integration stage. Currently, all event proceeds remain safe and verifiable in
          the official platform transaction logs.
        </p>
      </Card>
    </div>
  );
}
