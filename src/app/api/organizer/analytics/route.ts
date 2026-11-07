import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { Ticket } from "@/models/Ticket";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const range = searchParams.get("range") || "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "all" ? 3650 : 30;

    const organizerIds = [
      new mongoose.Types.ObjectId(authResult.id),
      authResult.organizerProfile?._id,
    ].filter(Boolean) as mongoose.Types.ObjectId[];

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Fetch all events belonging to this organizer
    const allOrgEvents = await Event.find({ organizerId: { $in: organizerIds } })
      .select("_id title status startDate registeredCount totalCapacity isFree")
      .lean();

    const allOrgEventIds = allOrgEvents.map((e) => e._id);
    const eventMap = new Map(allOrgEvents.map((e) => [e._id.toString(), e]));

    // 2. Aggregate Payments in date range
    const paymentFilter: Record<string, unknown> = {
      organizerId: { $in: organizerIds },
    };
    if (range !== "all") {
      paymentFilter.createdAt = { $gte: startDate, $lte: now };
    }

    const [successfulAgg, totalOrdersCount, eventSalesAgg, tierSalesAgg] = await Promise.all([
      // A. Successful orders summary
      Payment.aggregate<{
        _id: null;
        totalKobo: number;
        totalTickets: number;
        successfulCount: number;
      }>([
        {
          $match: {
            ...paymentFilter,
            paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
          },
        },
        {
          $group: {
            _id: null,
            totalKobo: { $sum: "$amountInKobo" },
            totalTickets: { $sum: "$quantity" },
            successfulCount: { $sum: 1 },
          },
        },
      ]),

      // B. Total orders attempted (to compute conversion)
      Payment.countDocuments(paymentFilter),

      // C. Sales breakdown by event
      Payment.aggregate<{
        _id: mongoose.Types.ObjectId;
        totalKobo: number;
        ticketsSold: number;
        orderCount: number;
      }>([
        {
          $match: {
            ...paymentFilter,
            paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
          },
        },
        {
          $group: {
            _id: "$eventId",
            totalKobo: { $sum: "$amountInKobo" },
            ticketsSold: { $sum: "$quantity" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalKobo: -1 } },
      ]),

      // D. Sales breakdown by ticket tier name
      Payment.aggregate<{
        _id: string;
        totalKobo: number;
        ticketsSold: number;
      }>([
        {
          $match: {
            ...paymentFilter,
            paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
          },
        },
        {
          $group: {
            _id: "$tierName",
            totalKobo: { $sum: "$amountInKobo" },
            ticketsSold: { $sum: "$quantity" },
          },
        },
        { $sort: { ticketsSold: -1 } },
      ]),
    ]);

    const totalGrossKobo = Math.round(successfulAgg[0]?.totalKobo || 0);
    const totalGrossNaira = Math.round(totalGrossKobo / 100);
    const totalTicketsSold = successfulAgg[0]?.totalTickets || 0;
    const successfulOrdersCount = successfulAgg[0]?.successfulCount || 0;

    const conversionRate =
      totalOrdersCount > 0
        ? Math.round((successfulOrdersCount / totalOrdersCount) * 1000) / 10
        : 100;

    const averageOrderValueInNaira =
      successfulOrdersCount > 0
        ? Math.round(totalGrossNaira / successfulOrdersCount)
        : 0;

    // 3. Faculty Demographics Aggregation from Tickets & Users
    const facultyAggregation = allOrgEventIds.length > 0
      ? await Ticket.aggregate<{
          _id: string;
          count: number;
        }>([
          { $match: { eventId: { $in: allOrgEventIds } } },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              faculty: { $ifNull: ["$userDoc.faculty", "Other / Unspecified"] },
            },
          },
          {
            $group: {
              _id: "$faculty",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ])
      : [];

    const totalAttendeesReporting = facultyAggregation.reduce((acc, f) => acc + f.count, 0);
    const facultyBreakdown = facultyAggregation.map((f) => ({
      faculty: f._id || "Other / Unspecified",
      attendeeCount: f.count,
      percentage:
        totalAttendeesReporting > 0
          ? Math.round((f.count / totalAttendeesReporting) * 1000) / 10
          : 0,
    }));

    // Format event breakdown
    const eventBreakdown = eventSalesAgg.map((s) => {
      const evt = eventMap.get(s._id.toString());
      return {
        eventId: s._id.toString(),
        eventTitle: evt?.title || "Unknown Event",
        status: evt?.status || "published",
        ticketsSold: s.ticketsSold,
        capacity: evt?.totalCapacity || 0,
        revenueInNaira: Math.round(s.totalKobo / 100),
        orderCount: s.orderCount,
      };
    });

    // Format tier breakdown
    const tierBreakdown = tierSalesAgg.map((t) => ({
      tierName: t._id || "Standard",
      ticketsSold: t.ticketsSold,
      revenueInNaira: Math.round(t.totalKobo / 100),
    }));

    return NextResponse.json({
      success: true,
      range,
      days,
      summary: {
        totalGrossKobo,
        totalGrossNaira,
        totalTicketsSold,
        successfulOrdersCount,
        totalOrdersCount,
        conversionRate,
        averageOrderValueInNaira,
        activeEventsCount: allOrgEvents.filter((e) => e.status === "published").length,
      },
      eventBreakdown,
      tierBreakdown,
      facultyBreakdown,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Organizer analytics error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load analytics data" },
      { status: 500 }
    );
  }
}
