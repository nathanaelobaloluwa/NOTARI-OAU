"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import {
  Calendar,
  Ticket,
  DollarSign,
  Clock,
  PlusCircle,
  BarChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPoint {
  date: string;
  label: string;
  amountInKobo: number;
  amountInNaira: number;
  ticketCount: number;
}

interface SalesTrend {
  range: string;
  days: number;
  percentageChange: number;
  totalCurrentInNaira: number;
  dataPoints: DataPoint[];
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  registered: number;
  capacity: number;
  status: string;
  isFree: boolean;
}

interface DashboardData {
  organizerName: string;
  metrics: {
    totalEvents: number;
    totalBookings: number;
    revenueInKobo: number;
    revenueInNaira: number;
    upcomingEvents: number;
  };
  salesTrend: SalesTrend;
  recentEvents: RecentEvent[];
}

export function OrganizerDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedRange, setSelectedRange] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const fetchMetrics = useCallback(async (range: "7d" | "30d" | "90d") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/dashboard-metrics?range=${range}`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      } else {
        setError(resData.message || "Failed to load dashboard metrics.");
      }
    } catch (err) {
      console.error("Dashboard metrics fetch error:", err);
      setError("Network error: Could not fetch dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(selectedRange);
  }, [fetchMetrics, selectedRange]);

  const metrics = data?.metrics || {
    totalEvents: 0,
    totalBookings: 0,
    revenueInKobo: 0,
    revenueInNaira: 0,
    upcomingEvents: 0,
  };

  const salesTrend = data?.salesTrend;
  const recentEvents = data?.recentEvents || [];
  const points = salesTrend?.dataPoints || [];
  const maxAmount = Math.max(...points.map((p) => p.amountInNaira), 1000);
  const hasSales = points.some((p) => p.amountInNaira > 0);

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 180;
  const paddingX = 20;
  const paddingYTop = 25;
  const paddingYBottom = 30;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingYTop - paddingYBottom;

  // Calculate coordinates for points
  const coords = points.map((p, idx) => {
    const x = paddingX + (idx / Math.max(points.length - 1, 1)) * plotWidth;
    const y = paddingYTop + plotHeight - (p.amountInNaira / maxAmount) * plotHeight;
    return { x, y, point: p };
  });

  // Build SVG path
  let pathD = "";
  let areaD = "";
  if (coords.length > 0) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }
    const last = coords[coords.length - 1];
    const first = coords[0];
    areaD = `${pathD} L ${last.x} ${paddingYTop + plotHeight} L ${first.x} ${paddingYTop + plotHeight} Z`;
  }

  const pct = salesTrend?.percentageChange || 0;
  const isPositive = pct >= 0;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Welcome back, {data?.organizerName || "Campus Org"}! 🎪
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time university event ticketing performance and sales analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics(selectedRange)}
            disabled={loading}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
          <Link href="/organizer/events/create">
            <Button className="rounded-xl h-9 px-4 gap-2 bg-purple-600 hover:bg-purple-700 shadow-sm text-xs font-semibold text-white">
              <PlusCircle className="w-4 h-4" />
              <span>Create New Event</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Total Events</p>
              <h3 className="text-lg sm:text-2xl font-bold text-notari-dark">{metrics.totalEvents}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Bookings</p>
              <h3 className="text-lg sm:text-2xl font-bold text-notari-dark">{metrics.totalBookings}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Net Revenue</p>
              <h3 className="text-lg sm:text-2xl font-bold text-notari-dark">
                ₦{metrics.revenueInNaira.toLocaleString()}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-3.5 sm:p-5 border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Upcoming</p>
              <h3 className="text-lg sm:text-2xl font-bold text-notari-dark">{metrics.upcomingEvents}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Sales Graph + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sales Overview Chart */}
        <div className="lg:col-span-8">
          <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-notari-dark">Event Sales Overview</h3>
                <p className="text-xs text-slate-400">
                  {selectedRange === "7d"
                    ? "Daily ticket sales & revenue (Last 7 days)"
                    : selectedRange === "30d"
                    ? "Daily sales trend (Last 30 days)"
                    : "Quarterly sales trend (Last 90 days)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1",
                    isPositive
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                      : "text-rose-700 bg-rose-50 border border-rose-200"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {pct}% vs prev period
                  </span>
                </span>
                <select
                  value={selectedRange}
                  onChange={(e) => setSelectedRange(e.target.value as "7d" | "30d" | "90d")}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>

            {/* Hover Tooltip Info */}
            {hoveredPoint && (
              <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between shadow-md">
                <span>{new Date(hoveredPoint.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                <span className="font-bold text-purple-300">
                  ₦{hoveredPoint.amountInNaira.toLocaleString()} ({hoveredPoint.ticketCount} passes)
                </span>
              </div>
            )}

            {/* Visual SVG Chart */}
            <div className="w-full pt-2">
              {loading ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  <span>Loading sales data...</span>
                </div>
              ) : (
                <div className="relative">
                  <svg className="w-full h-48 overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <defs>
                      <linearGradient id="orgSalesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="0" y1={paddingYTop} x2={svgWidth} y2={paddingYTop} stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1={paddingYTop + plotHeight * 0.33} x2={svgWidth} y2={paddingYTop + plotHeight * 0.33} stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1={paddingYTop + plotHeight * 0.66} x2={svgWidth} y2={paddingYTop + plotHeight * 0.66} stroke="#F1F5F9" strokeWidth="1" />
                    <line x1="0" y1={paddingYTop + plotHeight} x2={svgWidth} y2={paddingYTop + plotHeight} stroke="#E2E8F0" strokeWidth="1" />

                    {/* Filled Area */}
                    {areaD && hasSales && (
                      <path d={areaD} fill="url(#orgSalesGradient)" />
                    )}

                    {/* Stroke Line */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#7C3AED"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Interactive Data Points */}
                    {coords.map((c, i) => (
                      <circle
                        key={i}
                        cx={c.x}
                        cy={c.y}
                        r={hoveredPoint?.date === c.point.date ? 6 : 4}
                        fill="#7C3AED"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        className="cursor-pointer transition-all hover:scale-125"
                        onMouseEnter={() => setHoveredPoint(c.point)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}
                  </svg>

                  {/* X-axis labels */}
                  <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-3 px-2">
                    {points.length <= 10 ? (
                      points.map((p, i) => <span key={i}>{p.label}</span>)
                    ) : (
                      <>
                        <span>{points[0]?.label}</span>
                        <span>{points[Math.floor(points.length / 2)]?.label}</span>
                        <span>{points[points.length - 1]?.label}</span>
                      </>
                    )}
                  </div>

                  {!hasSales && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">No ticket sales in this period yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Once students purchase passes or tickets for your published events, daily trends will plot here.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4">
          <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-4">
            <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
              Quick Actions
            </h3>

            <div className="space-y-2.5">
              <Link href="/organizer/events/create" className="block">
                <Button className="w-full justify-start gap-2.5 h-11 text-xs font-semibold bg-purple-600 hover:bg-purple-700 shadow-xs text-white cursor-pointer">
                  <PlusCircle className="w-4 h-4" />
                  <span>Create New Event</span>
                </Button>
              </Link>
              <Link href="/organizer/events" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold text-slate-700 hover:text-notari-dark cursor-pointer">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Manage Events</span>
                </Button>
              </Link>
              <Link href="/organizer/orders" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold text-slate-700 hover:text-notari-dark cursor-pointer">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>View Bookings</span>
                </Button>
              </Link>
              <Link href="/organizer/analytics" className="block">
                <Button variant="outline" className="w-full justify-start gap-2.5 h-11 text-xs font-semibold text-slate-700 hover:text-notari-dark cursor-pointer">
                  <BarChart className="w-4 h-4 text-indigo-600" />
                  <span>View Reports & Analytics</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Organizer Events Table */}
      <Card className="p-6 border-slate-200/80 shadow-xs bg-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-notari-dark">My Active Events</h3>
            <p className="text-xs text-slate-400">Your most recently created campus events</p>
          </div>
          <Link href="/organizer/events" className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1">
            <span>View All Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-notari-dark">No campus events created yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get started by creating your first university event with custom ticket tiers and instant approval workflow.
            </p>
            <Link href="/organizer/events/create">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs mt-2">
                Create First Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Bookings</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-bold text-notari-dark">{evt.title}</td>
                    <td className="py-3.5 text-slate-500">
                      {new Date(evt.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 text-slate-700 font-semibold">
                      {evt.registered} / {evt.capacity > 0 ? evt.capacity : "∞"}
                    </td>
                    <td className="py-3.5">
                      <StatusPill status={evt.status} />
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/organizer/events/${evt.id}`}
                        className="text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
