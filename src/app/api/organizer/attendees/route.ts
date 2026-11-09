import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { Ticket } from "@/models/Ticket";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const eventIdParam = searchParams.get("eventId");
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const organizerIds = [
      new mongoose.Types.ObjectId(authResult.id),
      authResult.organizerProfile?._id,
    ].filter(Boolean) as mongoose.Types.ObjectId[];

    // 1. Fetch all events belonging to this organizer
    const orgEvents = await Event.find({ organizerId: { $in: organizerIds } })
      .select("_id title status startDate")
      .sort({ createdAt: -1 })
      .lean();

    const allOrgEventIds = orgEvents.map((e) => e._id);
    const eventMap = new Map(orgEvents.map((e) => [e._id.toString(), e.title]));

    // Determine target event IDs
    let targetEventIds: mongoose.Types.ObjectId[] = allOrgEventIds;
    if (eventIdParam && eventIdParam !== "all") {
      const matchEvent = orgEvents.find((e) => e._id.toString() === eventIdParam);
      if (!matchEvent) {
        return NextResponse.json(
          { success: false, message: "Event not found or not owned by this organizer." },
          { status: 403 }
        );
      }
      targetEventIds = [matchEvent._id];
    }

    if (targetEventIds.length === 0) {
      return NextResponse.json({
        success: true,
        attendees: [],
        events: [],
        stats: {
          totalAttendees: 0,
          checkedInCount: 0,
          notCheckedInCount: 0,
          checkInPercentage: 0,
        },
        pagination: { page: 1, limit, total: 0, totalPages: 1 },
      });
    }

    // 2. Build Ticket Filter Query
    const ticketFilter: Record<string, unknown> = {
      eventId: { $in: targetEventIds },
    };

    if (status === "checked_in") {
      ticketFilter.isCheckedIn = true;
    } else if (status === "not_checked_in") {
      ticketFilter.isCheckedIn = false;
    }

    if (search.length > 0) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      ticketFilter.$or = [
        { attendeeName: searchRegex },
        { attendeeEmail: searchRegex },
        { ticketCode: searchRegex },
      ];
    }

    // 3. Execute Ticket Queries & Stats Aggregation
    const [tickets, totalCount, statsAgg] = await Promise.all([
      Ticket.find(ticketFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ userId: { matricNumber?: string } | null }>("userId", "matricNumber")
        .lean(),
      Ticket.countDocuments(ticketFilter),
      Ticket.aggregate<{
        _id: null;
        total: number;
        checkedIn: number;
      }>([
        { $match: { eventId: { $in: targetEventIds } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            checkedIn: { $sum: { $cond: ["$isCheckedIn", 1, 0] } },
          },
        },
      ]),
    ]);

    const totalAttendees = statsAgg[0]?.total || 0;
    const checkedInCount = statsAgg[0]?.checkedIn || 0;
    const notCheckedInCount = Math.max(0, totalAttendees - checkedInCount);
    const checkInPercentage =
      totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 1000) / 10 : 0;

    const attendees = tickets.map((t) => ({
      id: t._id.toString(),
      ticketCode: t.ticketCode,
      attendeeName: t.attendeeName,
      attendeeEmail: t.attendeeEmail,
      matricNumber: t.userId?.matricNumber || null,
      tierName: t.tierName,
      pricePaid: t.pricePaid,
      isCheckedIn: t.isCheckedIn,
      checkedInAt: t.checkedInAt ? new Date(t.checkedInAt).toISOString() : null,
      eventId: t.eventId.toString(),
      eventTitle: eventMap.get(t.eventId.toString()) || "Event",
      registeredAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      attendees,
      events: orgEvents.map((e) => ({
        id: e._id.toString(),
        title: e.title,
        status: e.status,
      })),
      stats: {
        totalAttendees,
        checkedInCount,
        notCheckedInCount,
        checkInPercentage,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Organizer attendees API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load attendees." },
      { status: 500 }
    );
  }
}
