"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  Ticket,
  TrendingUp,
  Percent,
  Calendar,
  GraduationCap,
  Users,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsSummary {
  totalGrossKobo: number;
  totalGrossNaira: number;
  totalTicketsSold: number;
  successfulOrdersCount: number;
  totalOrdersCount: number;
  conversionRate: number;
  averageOrderValueInNaira: number;
  activeEventsCount: number;
}

interface EventPerformance {
  eventId: string;
  eventTitle: string;
  status: string;
  ticketsSold: number;
  capacity: number;
  revenueInNaira: number;
  orderCount: number;
}

interface TierPerformance {
  tierName: string;
  ticketsSold: number;
  revenueInNaira: number;
}

interface FacultyDemographic {
  faculty: string;
  attendeeCount: number;
  percentage: number;
}

export function OrganizerAnalyticsClient() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalGrossKobo: 0,
    totalGrossNaira: 0,
    totalTicketsSold: 0,
    successfulOrdersCount: 0,
    totalOrdersCount: 0,
    conversionRate: 100,
    averageOrderValueInNaira: 0,
    activeEventsCount: 0,
  });

  const [eventBreakdown, setEventBreakdown] = useState<EventPerformance[]>([]);
  const [tierBreakdown, setTierBreakdown] = useState<TierPerformance[]>([]);
  const [facultyBreakdown, setFacultyBreakdown] = useState<FacultyDemographic[]>([]);

  const fetchAnalytics = useCallback(async (selectedRange: "7d" | "30d" | "90d" | "all") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/analytics?range=${selectedRange}`);
      const data = await res.json();

      if (data.success) {
        if (data.summary) setSummary(data.summary);
        setEventBreakdown(data.eventBreakdown || []);
        setTierBreakdown(data.tierBreakdown || []);
        setFacultyBreakdown(data.facultyBreakdown || []);
      } else {
        setError(data.message || "Failed to load analytics.");
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Network error: Could not fetch analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(range);
  }, [fetchAnalytics, range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Event Analytics & Insights
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time ticketing revenue, conversion metrics, and attendee demographic breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as "7d" | "30d" | "90d" | "all")}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All Time</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(range)}
            disabled={loading}
            className="h-9 rounded-xl text-xs gap-1 border-slate-200 text-slate-600"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Gross Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-notari-dark mt-0.5">
                ₦{summary.totalGrossNaira.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Passes Sold</p>
              <p className="text-xl sm:text-2xl font-bold text-notari-dark mt-0.5">
                {summary.totalTicketsSold}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-emerald-600 font-medium">Checkout Conversion</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">
                {summary.conversionRate}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Avg Order Value</p>
              <p className="text-xl sm:text-2xl font-bold text-notari-dark mt-0.5">
                ₦{summary.averageOrderValueInNaira.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span>Analyzing campus event metrics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Event Performance & Tier Breakdown */}
          <div className="lg:col-span-7 space-y-6">
            {/* Event Sales Performance Table */}
            <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
                    Event Sales Performance
                  </h3>
                  <p className="text-xs text-slate-400">Ticket sales and revenue by campus event</p>
                </div>
                <Link href="/organizer/events" className="text-xs font-semibold text-purple-600 hover:underline">
                  View All Events
                </Link>
              </div>

              {eventBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No ticket sales recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3">Event</th>
                        <th className="pb-3">Passes Sold</th>
                        <th className="pb-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eventBreakdown.map((evt) => (
                        <tr key={evt.eventId} className="hover:bg-slate-50/50">
                          <td className="py-3 font-semibold text-notari-dark max-w-[200px] truncate">
                            <Link href={`/organizer/events/${evt.eventId}`} className="hover:text-purple-600 hover:underline">
                              {evt.eventTitle}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-600">
                            {evt.ticketsSold} {evt.capacity > 0 ? `/ ${evt.capacity}` : ""}
                          </td>
                          <td className="py-3 text-right font-bold text-notari-dark">
                            ₦{evt.revenueInNaira.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Ticket Tier Breakdown */}
            {tierBreakdown.length > 0 && (
              <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
                  Ticket Tier Distribution
                </h3>
                <div className="space-y-3">
                  {tierBreakdown.map((tier) => (
                    <div key={tier.tierName} className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-notari-dark">{tier.tierName}</p>
                        <p className="text-[11px] text-slate-400">{tier.ticketsSold} passes issued</p>
                      </div>
                      <span className="font-bold text-notari-dark">₦{tier.revenueInNaira.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Faculty Demographics & Conversion Funnel */}
          <div className="lg:col-span-5 space-y-6">
            {/* Faculty Demographics */}
            <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
                  Attendee Faculty Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Distribution of attendees across Obafemi Awolowo University faculties.
              </p>

              {facultyBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No faculty demographic data recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {facultyBreakdown.map((f) => (
                    <div key={f.faculty} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">
                          {f.faculty}
                        </span>
                        <span className="font-bold text-notari-dark">
                          {f.percentage}% ({f.attendeeCount})
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, f.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Conversion Summary Card */}
            <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
                Booking Conversion Metrics
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Checkout Initiated:</span>
                  <span className="font-bold text-notari-dark">{summary.totalOrdersCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Completed & Verified Orders:</span>
                  <span className="font-bold text-emerald-600">
                    {summary.successfulOrdersCount} ({summary.conversionRate}%)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Active Published Events:</span>
                  <span className="font-bold text-indigo-600">{summary.activeEventsCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
