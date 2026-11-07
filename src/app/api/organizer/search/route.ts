import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { Payment } from "@/models/Payment";
import { Ticket } from "@/models/Ticket";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    const searchParams = req.nextUrl.searchParams;
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        results: { events: [], orders: [], attendees: [] },
      });
    }

    await connectToDatabase();

    const organizerIds = [
      new mongoose.Types.ObjectId(authResult.id),
      authResult.organizerProfile?._id,
    ].filter(Boolean) as mongoose.Types.ObjectId[];

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // 1. Fetch matching events belonging to this organizer
    const matchingEvents = await Event.find({
      organizerId: { $in: organizerIds },
      $or: [{ title: regex }, { venue: regex }, { category: regex }],
    })
      .select("_id title venue category status startDate registeredCount totalCapacity")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Fetch all event IDs belonging to this organizer for scoped tickets
    const allOrgEvents = await Event.find({
      organizerId: { $in: organizerIds },
    })
      .select("_id title")
      .lean();

    const eventIdMap = new Map(allOrgEvents.map((e) => [e._id.toString(), e.title]));
    const allOrgEventIds = allOrgEvents.map((e) => e._id);

    // 2. Fetch matching orders
    const matchingPayments = await Payment.find({
      organizerId: { $in: organizerIds },
      $or: [{ paymentReference: regex }, { customerName: regex }, { customerEmail: regex }],
    })
      .select("_id paymentReference customerName customerEmail amount paymentStatus tierName createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 3. Fetch matching attendees for this organizer's events
    const matchingTickets = allOrgEventIds.length > 0
      ? await Ticket.find({
          eventId: { $in: allOrgEventIds },
          $or: [{ ticketCode: regex }, { attendeeName: regex }, { attendeeEmail: regex }],
        })
          .select("_id ticketCode attendeeName attendeeEmail tierName isCheckedIn eventId createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      : [];

    return NextResponse.json({
      success: true,
      query: q,
      results: {
        events: matchingEvents.map((evt) => ({
          id: evt._id.toString(),
          title: evt.title,
          venue: evt.venue,
          category: evt.category,
          status: evt.status,
          startDate: evt.startDate,
          url: `/organizer/events/${evt._id.toString()}`,
        })),
        orders: matchingPayments.map((p) => ({
          id: p._id.toString(),
          reference: p.paymentReference,
          customerName: p.customerName,
          customerEmail: p.customerEmail,
          amount: p.amount,
          status: p.paymentStatus,
          tierName: p.tierName,
          url: `/organizer/orders?search=${encodeURIComponent(p.paymentReference)}`,
        })),
        attendees: matchingTickets.map((t) => ({
          id: t._id.toString(),
          ticketCode: t.ticketCode,
          attendeeName: t.attendeeName,
          attendeeEmail: t.attendeeEmail,
          tierName: t.tierName,
          isCheckedIn: t.isCheckedIn,
          eventTitle: eventIdMap.get(t.eventId.toString()) || "Event",
          url: `/organizer/attendees?search=${encodeURIComponent(t.ticketCode)}`,
        })),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Organizer search error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to search records" },
      { status: 500 }
    );
  }
}
