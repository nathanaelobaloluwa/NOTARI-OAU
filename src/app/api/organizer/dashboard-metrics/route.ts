import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { Booking } from "@/models/Booking";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { getOrganizerFinancialSummary } from "@/lib/financial/balance";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get("range") || "7d";
    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;

    const organizerIds = [
      new mongoose.Types.ObjectId(authResult.id),
      authResult.organizerProfile?._id,
    ].filter(Boolean) as mongoose.Types.ObjectId[];

    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousWindowStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    // 1. Core KPIs
    const [totalEvents, upcomingEvents, allOrgEvents, financialSummary] = await Promise.all([
      Event.countDocuments({ organizerId: { $in: organizerIds } }),
      Event.countDocuments({
        organizerId: { $in: organizerIds },
        status: "published",
        startDate: { $gte: now },
      }),
      Event.find({ organizerId: { $in: organizerIds } }).select("_id").lean(),
      getOrganizerFinancialSummary(organizerIds),
    ]);

    const allOrgEventIds = allOrgEvents.map((e) => e._id);

    // Total bookings count (paid + free)
    const totalBookings = await Booking.countDocuments({
      $or: [
        { organizerId: { $in: organizerIds } },
        { eventId: { $in: allOrgEventIds } },
      ],
      paymentStatus: { $in: ["successful", "pending"] },
    });

    // Net Revenue in integer Kobo
    const revenueInKobo = Math.max(0, financialSummary.grossSalesInKobo - financialSummary.refundsInKobo);
    const revenueInNaira = Math.round(revenueInKobo / 100);

    // 2. Recent Events Table Data
    const recentEventsRaw = await Event.find({ organizerId: { $in: organizerIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id title startDate registeredCount totalCapacity status isFree")
      .lean();

    const recentEvents = recentEventsRaw.map((evt) => ({
      id: evt._id.toString(),
      title: evt.title,
      date: evt.startDate ? new Date(evt.startDate).toISOString() : new Date().toISOString(),
      registered: evt.registeredCount || 0,
      capacity: evt.totalCapacity || 0,
      status: evt.status,
      isFree: Boolean(evt.isFree),
    }));

    // 3. Sales Trend by Day for Current Window
    const currentSalesAggregation = await Payment.aggregate<{
      _id: string; // YYYY-MM-DD
      totalKobo: number;
      totalNaira: number;
      ticketCount: number;
    }>([
      {
        $match: {
          organizerId: { $in: organizerIds },
          paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
          createdAt: { $gte: currentWindowStart, $lte: now },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalKobo: { $sum: "$amountInKobo" },
          totalNaira: { $sum: "$amount" },
          ticketCount: { $sum: "$quantity" },
        },
      },
    ]);

    // Sales in previous window for genuine comparison
    const previousSalesAggregation = await Payment.aggregate<{
      totalKobo: number;
    }>([
      {
        $match: {
          organizerId: { $in: organizerIds },
          paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
          createdAt: { $gte: previousWindowStart, $lt: currentWindowStart },
        },
      },
      {
        $group: {
          _id: null,
          totalKobo: { $sum: "$amountInKobo" },
        },
      },
    ]);

    const currentTotalKobo = currentSalesAggregation.reduce((acc, c) => acc + (c.totalKobo || 0), 0);
    const previousTotalKobo = previousSalesAggregation[0]?.totalKobo || 0;

    let percentageChange = 0;
    if (previousTotalKobo > 0) {
      percentageChange = Math.round(((currentTotalKobo - previousTotalKobo) / previousTotalKobo) * 1000) / 10;
    } else if (currentTotalKobo > 0) {
      percentageChange = 100;
    }

    // Map aggregated results to complete day buckets
    const salesMap = new Map(currentSalesAggregation.map((s) => [s._id, s]));
    const dayBuckets: {
      date: string;
      label: string;
      amountInKobo: number;
      amountInNaira: number;
      ticketCount: number;
    }[] = [];

    const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const existing = salesMap.get(dateStr);

      let label = "";
      if (days === 7) {
        label = weekdayShort[d.getDay()];
      } else {
        label = `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;
      }

      dayBuckets.push({
        date: dateStr,
        label,
        amountInKobo: existing?.totalKobo || 0,
        amountInNaira: existing ? Math.round(existing.totalKobo / 100) : 0,
        ticketCount: existing?.ticketCount || 0,
      });
    }

    return NextResponse.json({
      success: true,
      organizerName: authResult.organizerProfile?.organizationName || authResult.name || "Campus Org",
      metrics: {
        totalEvents,
        totalBookings,
        revenueInKobo,
        revenueInNaira,
        upcomingEvents,
      },
      salesTrend: {
        range,
        days,
        percentageChange,
        totalCurrentInNaira: Math.round(currentTotalKobo / 100),
        dataPoints: dayBuckets,
      },
      recentEvents,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Organizer dashboard metrics error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
