import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Ticket, ITicketDocument } from "@/models/Ticket";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { TicketSecurityService } from "@/lib/tickets/qr";
import { CheckInAttendeeQueryInput } from "@/validators/check-in";

export interface VerifyAndCheckInParams {
  eventId: string;
  ticketCode: string;
  operatorId: string;
  operatorName?: string;
  signature?: string;
  scanMode?: "qr" | "manual" | "offline_sync";
  offlineTimestamp?: string;
}

export interface CheckInResult {
  success: boolean;
  code:
    | "SUCCESS"
    | "ALREADY_CHECKED_IN"
    | "INVALID_SIGNATURE"
    | "INVALIDATED_TICKET"
    | "EVENT_MISMATCH"
    | "TICKET_NOT_FOUND"
    | "UNAUTHORIZED"
    | "SERVER_ERROR";
  status: number;
  message: string;
  ticket?: {
    id: string;
    ticketCode: string;
    tierName: string;
    attendeeName: string;
    attendeeEmail: string;
    pricePaid: number;
    isCheckedIn: boolean;
    checkedInAt?: string;
    checkedInBy?: string;
    checkedInByName?: string;
    isInvalidated?: boolean;
    invalidatedReason?: string;
  };
  event?: {
    id: string;
    title: string;
    venue: string;
  };
}

export interface CheckInStatsResult {
  eventId: string;
  eventTitle: string;
  venue: string;
  totalTickets: number;
  checkedInCount: number;
  remainingCount: number;
  checkInPercentage: number;
  recentCheckIns: Array<{
    id: string;
    ticketCode: string;
    tierName: string;
    attendeeName: string;
    attendeeEmail: string;
    checkedInAt: string;
  }>;
}

/**
 * Validates whether the given operator is authorized to check in attendees for the event.
 */
async function verifyOperatorEventAuthorization(
  eventId: string,
  operatorId: string
): Promise<{ authorized: boolean; event?: InstanceType<typeof Event> }> {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return { authorized: false };
  }

  const [event, operator] = await Promise.all([
    Event.findById(eventId),
    User.findById(operatorId).select("role isOrganizer").lean(),
  ]);

  if (!event || !operator) {
    return { authorized: false };
  }

  // Superadmins have universal check-in oversight
  if (operator.role === "admin") {
    return { authorized: true, event };
  }

  // Event owner organizer
  const isOwner = event.organizerId && event.organizerId.toString() === operatorId;
  if (isOwner) {
    return { authorized: true, event };
  }

  return { authorized: false, event };
}

/**
 * Server-Side Ticket Verification & Atomic Gate Check-In
 * Enforces cryptographic HMAC-SHA256 signature verification, event scoping,
 * void/refund detection, and atomic race-free check-in.
 */
export async function verifyAndCheckInTicket(
  params: VerifyAndCheckInParams
): Promise<CheckInResult> {
  const { eventId, ticketCode, operatorId, signature, offlineTimestamp } = params;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return {
      success: false,
      code: "EVENT_MISMATCH",
      status: 400,
      message: "Invalid event ID format provided.",
    };
  }

  await connectToDatabase();

  // 1. Authorize operator
  const authCheck = await verifyOperatorEventAuthorization(eventId, operatorId);
  if (!authCheck.authorized || !authCheck.event) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      status: 403,
      message: "Access denied. You do not have gate check-in authorization for this event.",
    };
  }
  const event = authCheck.event;

  const normalizedCode = ticketCode.trim().toUpperCase();

  // 2. Find ticket in MongoDB
  const ticket = await Ticket.findOne({ ticketCode: normalizedCode });
  if (!ticket) {
    return {
      success: false,
      code: "TICKET_NOT_FOUND",
      status: 404,
      message: `Ticket pass ${normalizedCode} was not found in the university registry.`,
    };
  }

  // 3. Confirm ticket belongs to this exact event
  if (ticket.eventId.toString() !== eventId) {
    return {
      success: false,
      code: "EVENT_MISMATCH",
      status: 400,
      message: `Event mismatch: This pass is issued for a different event and cannot be used for "${event.title}".`,
      ticket: {
        id: ticket._id.toString(),
        ticketCode: ticket.ticketCode,
        tierName: ticket.tierName,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        pricePaid: ticket.pricePaid,
        isCheckedIn: ticket.isCheckedIn,
      },
    };
  }

  // 4. Validate cryptographic signature if provided
  if (signature) {
    const isSigValid = TicketSecurityService.verifyTicketSignature(
      normalizedCode,
      eventId,
      signature
    );
    if (!isSigValid) {
      return {
        success: false,
        code: "INVALID_SIGNATURE",
        status: 400,
        message: "Cryptographic ticket signature verification failed. Counterfeit pass detected.",
      };
    }
  }

  // 5. Check if ticket has been voided or refunded
  if (ticket.isInvalidated) {
    return {
      success: false,
      code: "INVALIDATED_TICKET",
      status: 400,
      message: `Invalidated ticket: This pass was refunded or cancelled${ticket.invalidatedReason ? ` (${ticket.invalidatedReason})` : ""}. Admission denied.`,
      ticket: {
        id: ticket._id.toString(),
        ticketCode: ticket.ticketCode,
        tierName: ticket.tierName,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        pricePaid: ticket.pricePaid,
        isCheckedIn: ticket.isCheckedIn,
        isInvalidated: true,
        invalidatedReason: ticket.invalidatedReason,
      },
    };
  }

  // 6. Check if ticket is already checked in (Duplicate Entrance Prevention)
  if (ticket.isCheckedIn) {
    const checkedInAtStr = ticket.checkedInAt
      ? ticket.checkedInAt.toISOString()
      : "earlier time";
    return {
      success: false,
      code: "ALREADY_CHECKED_IN",
      status: 409,
      message: `Duplicate entrance prevented! Ticket was already checked in at ${checkedInAtStr}.`,
      ticket: {
        id: ticket._id.toString(),
        ticketCode: ticket.ticketCode,
        tierName: ticket.tierName,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        pricePaid: ticket.pricePaid,
        isCheckedIn: true,
        checkedInAt: ticket.checkedInAt?.toISOString(),
        checkedInBy: ticket.checkedInBy?.toString(),
      },
      event: {
        id: event._id.toString(),
        title: event.title,
        venue: event.venue,
      },
    };
  }

  // 7. Atomic MongoDB update with concurrency locking
  const checkInTimestamp = offlineTimestamp ? new Date(offlineTimestamp) : new Date();

  const updatedTicket: ITicketDocument | null = await Ticket.findOneAndUpdate(
    {
      _id: ticket._id,
      isCheckedIn: false,
      isInvalidated: { $ne: true },
    },
    {
      $set: {
        isCheckedIn: true,
        checkedInAt: checkInTimestamp,
        checkedInBy: new mongoose.Types.ObjectId(operatorId),
      },
    },
    { new: true }
  );

  // If another concurrent request checked in the ticket in the microsecond window
  if (!updatedTicket) {
    const refreshed = await Ticket.findById(ticket._id);
    return {
      success: false,
      code: "ALREADY_CHECKED_IN",
      status: 409,
      message: `Concurrent check-in prevented! Ticket was just admitted at ${refreshed?.checkedInAt?.toISOString() || "just now"}.`,
      ticket: {
        id: ticket._id.toString(),
        ticketCode: ticket.ticketCode,
        tierName: ticket.tierName,
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        pricePaid: ticket.pricePaid,
        isCheckedIn: true,
        checkedInAt: refreshed?.checkedInAt?.toISOString(),
      },
    };
  }

  return {
    success: true,
    code: "SUCCESS",
    status: 200,
    message: `Admission confirmed! Welcome, ${updatedTicket.attendeeName}.`,
    ticket: {
      id: updatedTicket._id.toString(),
      ticketCode: updatedTicket.ticketCode,
      tierName: updatedTicket.tierName,
      attendeeName: updatedTicket.attendeeName,
      attendeeEmail: updatedTicket.attendeeEmail,
      pricePaid: updatedTicket.pricePaid,
      isCheckedIn: true,
      checkedInAt: updatedTicket.checkedInAt?.toISOString(),
      checkedInBy: updatedTicket.checkedInBy?.toString(),
    },
    event: {
      id: event._id.toString(),
      title: event.title,
      venue: event.venue,
    },
  };
}

/**
 * Retrieve check-in metrics and recent door activity for an event.
 */
export async function getEventCheckInStats(
  eventId: string,
  operatorId: string
): Promise<CheckInStatsResult> {
  await connectToDatabase();

  const authCheck = await verifyOperatorEventAuthorization(eventId, operatorId);
  if (!authCheck.authorized || !authCheck.event) {
    throw new Error("Unauthorized to access check-in statistics for this event.");
  }
  const event = authCheck.event;

  const eventObjectId = new mongoose.Types.ObjectId(eventId);

  const [totalTickets, checkedInCount, recentDocs] = await Promise.all([
    Ticket.countDocuments({
      eventId: eventObjectId,
      isInvalidated: { $ne: true },
    }),
    Ticket.countDocuments({
      eventId: eventObjectId,
      isCheckedIn: true,
      isInvalidated: { $ne: true },
    }),
    Ticket.find({
      eventId: eventObjectId,
      isCheckedIn: true,
      isInvalidated: { $ne: true },
    })
      .sort({ checkedInAt: -1 })
      .limit(15)
      .lean(),
  ]);

  const remainingCount = Math.max(0, totalTickets - checkedInCount);
  const checkInPercentage =
    totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;

  const recentCheckIns = recentDocs.map((doc) => ({
    id: doc._id.toString(),
    ticketCode: doc.ticketCode,
    tierName: doc.tierName,
    attendeeName: doc.attendeeName,
    attendeeEmail: doc.attendeeEmail,
    checkedInAt: doc.checkedInAt ? doc.checkedInAt.toISOString() : doc.updatedAt.toISOString(),
  }));

  return {
    eventId,
    eventTitle: event.title,
    venue: event.venue,
    totalTickets,
    checkedInCount,
    remainingCount,
    checkInPercentage,
    recentCheckIns,
  };
}

/**
 * Retrieve attendees list for an event with search and pagination support.
 * Also used to download offline attendee rosters.
 */
export async function getEventAttendees(
  eventId: string,
  operatorId: string,
  query: CheckInAttendeeQueryInput
) {
  await connectToDatabase();

  const authCheck = await verifyOperatorEventAuthorization(eventId, operatorId);
  if (!authCheck.authorized || !authCheck.event) {
    throw new Error("Unauthorized to view attendee list for this event.");
  }

  const eventObjectId = new mongoose.Types.ObjectId(eventId);
  const filter: Record<string, unknown> = {
    eventId: eventObjectId,
    isInvalidated: { $ne: true },
  };

  if (query.status === "checked_in") {
    filter.isCheckedIn = true;
  } else if (query.status === "pending") {
    filter.isCheckedIn = false;
  }

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { ticketCode: regex },
      { attendeeName: regex },
      { attendeeEmail: regex },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [attendees, totalCount] = await Promise.all([
    Ticket.find(filter)
      .sort({ isCheckedIn: 1, attendeeName: 1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Ticket.countDocuments(filter),
  ]);

  const items = attendees.map((t) => ({
    id: t._id.toString(),
    ticketCode: t.ticketCode,
    tierName: t.tierName,
    attendeeName: t.attendeeName,
    attendeeEmail: t.attendeeEmail,
    pricePaid: t.pricePaid,
    isCheckedIn: t.isCheckedIn,
    checkedInAt: t.checkedInAt?.toISOString(),
  }));

  return {
    eventId,
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalCount,
      totalPages: Math.ceil(totalCount / query.limit) || 1,
    },
  };
}

