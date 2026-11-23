import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event, IEventDocument } from "@/models/Event";
import { Booking } from "@/models/Booking";
import { Ticket } from "@/models/Ticket";
import {
  EventReminderDispatch,
  ReminderStage,
} from "@/models/EventReminderDispatch";
import { notificationService } from "./notification.service";

export interface ReminderProcessResult {
  eventsChecked: number;
  remindersAttempted: number;
  remindersDispatched: number;
  alreadyDispatched: number;
  skippedIneligible: number;
  errors: Array<{ eventId: string; userId?: string; error: string }>;
}

export interface EligibleAttendee {
  userId: string;
  name: string;
  email: string;
  bookingReference?: string;
  ticketCodes: string[];
}

let legacyIndexChecked = false;
async function ensureModernReminderIndexes() {
  if (legacyIndexChecked) return;
  try {
    await EventReminderDispatch.collection.dropIndex("userId_1_eventId_1_stage_1");
  } catch {
    // Index did not exist or was already migrated
  }
  legacyIndexChecked = true;
}

/**
 * Deterministically formats the unique schedule identifier for an event.
 * Changes whenever the event's schedule version increments or startDate moves.
 */
export function getEventScheduleKey(event: {
  _id: unknown;
  startDate: Date | string;
  scheduleVersion?: number;
}): string {
  const version = event.scheduleVersion || 1;
  const time = new Date(event.startDate).getTime();
  return `v${version}_${time}`;
}

export class ReminderService {
  /**
   * Identifies all eligible attendees for an event:
   * Confirmed bookings (paymentStatus: "successful") and active non-invalidated tickets (isInvalidated: false).
   * Excludes refunded, cancelled, or voided tickets.
   */
  async getEligibleAttendees(eventId: string | mongoose.Types.ObjectId): Promise<EligibleAttendee[]> {
    await connectToDatabase();
    const eventObjId = new mongoose.Types.ObjectId(eventId);

    // 1. Fetch valid tickets for this event
    const activeTickets = await Ticket.find({
      eventId: eventObjId,
      isInvalidated: { $ne: true },
    }).lean();

    if (!activeTickets || activeTickets.length === 0) {
      return [];
    }

    // 2. Fetch associated confirmed bookings to ensure paymentStatus === "successful"
    const bookingIds = [...new Set(activeTickets.map((t) => t.bookingId.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const confirmedBookings = await Booking.find({
      _id: { $in: bookingIds },
      paymentStatus: "successful",
    }).lean();

    const confirmedBookingIdSet = new Set(confirmedBookings.map((b) => b._id.toString()));
    const bookingRefMap = new Map<string, string>();
    confirmedBookings.forEach((b) => bookingRefMap.set(b._id.toString(), b.bookingReference));

    // 3. Filter tickets belonging to confirmed bookings and group by user
    const eligibleTickets = activeTickets.filter((t) =>
      confirmedBookingIdSet.has(t.bookingId.toString())
    );

    const userTicketsMap = new Map<string, { name: string; email: string; bookingRef?: string; codes: string[] }>();

    for (const ticket of eligibleTickets) {
      const uId = ticket.userId.toString();
      const existing = userTicketsMap.get(uId);
      const bookingRef = bookingRefMap.get(ticket.bookingId.toString());

      if (existing) {
        if (!existing.codes.includes(ticket.ticketCode)) {
          existing.codes.push(ticket.ticketCode);
        }
      } else {
        userTicketsMap.set(uId, {
          name: ticket.attendeeName,
          email: ticket.attendeeEmail.toLowerCase().trim(),
          bookingRef,
          codes: [ticket.ticketCode],
        });
      }
    }

    const attendees: EligibleAttendee[] = [];
    for (const [userId, info] of userTicketsMap.entries()) {
      attendees.push({
        userId,
        name: info.name,
        email: info.email,
        bookingReference: info.bookingRef,
        ticketCodes: info.codes,
      });
    }

    return attendees;
  }

  /**
   * Dispatches a reminder to a single attendee with database-backed atomic idempotency.
   * Duplicate cron executions or parallel workers will be safely intercepted.
   */
  async dispatchAttendeeReminder(params: {
    event: IEventDocument;
    attendee: EligibleAttendee;
    stage: ReminderStage;
    customMessage?: string;
  }): Promise<{ dispatched: boolean; alreadyDispatched: boolean; error?: string }> {
    const { event, attendee, stage, customMessage } = params;
    const eventId = event._id.toString();
    const scheduleVersion = event.scheduleVersion || 1;
    const scheduleKey = getEventScheduleKey(event);
    const idempotencyKey = `${eventId}:${attendee.userId}:${stage}:${scheduleKey}`;

    try {
      await connectToDatabase();
      await ensureModernReminderIndexes();

      // 1. Attempt atomic creation of EventReminderDispatch
      let dispatchRecord;
      try {
        dispatchRecord = await EventReminderDispatch.create({
          eventId: event._id,
          userId: new mongoose.Types.ObjectId(attendee.userId),
          stage,
          scheduleVersion,
          recipientEmail: attendee.email,
          recipientName: attendee.name,
          eventTitle: event.title,
          eventStartDate: event.startDate,
          eventVenue: event.venue,
          idempotencyKey,
          dispatchedAt: new Date(),
        });
      } catch (err: unknown) {
        // E11000 duplicate key error means this reminder was already claimed/sent
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
          // Worker Crash Recovery: check if an uncompleted record was stranded > 2 minutes ago
          const existing = await EventReminderDispatch.findOne({ idempotencyKey });
          if (existing && !existing.inAppSent && !existing.emailSent) {
            const ageMs = Date.now() - new Date(existing.dispatchedAt).getTime();
            if (ageMs > 2 * 60 * 1000) {
              console.warn(`🔄 [REMINDER_RECOVERY] Recovering stranded reminder for ${attendee.email} (${idempotencyKey})`);
              dispatchRecord = existing;
            } else {
              return { dispatched: false, alreadyDispatched: true };
            }
          } else {
            return { dispatched: false, alreadyDispatched: true };
          }
        } else {
          throw err;
        }
      }

      // 2. Dispatch via notificationService (in-app + email)
      const notifyResult = await notificationService.notifyEventReminder({
        userId: attendee.userId,
        studentName: attendee.name,
        studentEmail: attendee.email,
        eventId: event._id,
        eventTitle: event.title,
        eventVenue: event.venue,
        eventDate: event.startDate,
        stage,
        scheduleVersion,
        scheduleKey,
        bookingReference: attendee.bookingReference,
        ticketCodes: attendee.ticketCodes,
        onlineLink: event.onlineDetails?.link,
        customMessage,
      });

      // 3. Update dispatch record with audit data
      dispatchRecord.inAppSent = true;
      dispatchRecord.emailSent = notifyResult.delivered;
      dispatchRecord.emailStatus = notifyResult.delivered ? "delivered" : "accepted";
      await dispatchRecord.save();

      return { dispatched: true, alreadyDispatched: false };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [REMINDER_DISPATCH_ERROR] Event ${eventId}, User ${attendee.userId}:`, errorMsg);
      return { dispatched: false, alreadyDispatched: false, error: errorMsg };
    }
  }

  /**
   * Main cron engine: processes due 24h and 1h reminders for published upcoming events.
   * - 24-hour window: event.startDate between (now + 23h) and (now + 25h).
   *   (Fallback: also catches any future event starting in < 24h and > 1.5h if 24h reminder not yet dispatched)
   * - 1-hour window: event.startDate between now and (now + 1.25h).
   */
  async processDueEventReminders(options?: {
    batchLimit?: number;
    referenceDate?: Date;
  }): Promise<ReminderProcessResult> {
    await connectToDatabase();
    const now = options?.referenceDate || new Date();
    const batchLimit = options?.batchLimit || 50;

    const result: ReminderProcessResult = {
      eventsChecked: 0,
      remindersAttempted: 0,
      remindersDispatched: 0,
      alreadyDispatched: 0,
      skippedIneligible: 0,
      errors: [],
    };

    // Calculate time windows (Africa/Lagos UTC)
    const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // 1. Query upcoming published events in both the 24h and 1h horizons
    const candidateEvents = await Event.find({
      status: "published",
      startDate: {
        $gt: now, // Must strictly be in the future (skip ended / past events)
        $lte: twentyFiveHoursFromNow,
      },
    })
      .limit(batchLimit)
      .exec();

    result.eventsChecked = candidateEvents.length;

    for (const event of candidateEvents) {
      const eventStartTime = new Date(event.startDate).getTime();
      const diffMs = eventStartTime - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Determine which stages are due
      const stagesDue: ReminderStage[] = [];

      // 1-hour stage: 0 to 1.25 hours away
      if (diffHours > 0 && diffHours <= 1.25) {
        stagesDue.push("1h");
      }
      // 24-hour stage: between 23 and 25 hours away
      // Or if between 1.5h and 24h and 24h was never sent yet
      if (diffHours >= 23 && diffHours <= 25) {
        stagesDue.push("24h");
      } else if (diffHours > 1.5 && diffHours < 23) {
        stagesDue.push("24h");
      }

      if (stagesDue.length === 0) {
        continue;
      }

      // Fetch eligible attendees
      const attendees = await this.getEligibleAttendees(event._id);
      if (attendees.length === 0) {
        result.skippedIneligible++;
        continue;
      }

      for (const stage of stagesDue) {
        for (const attendee of attendees) {
          result.remindersAttempted++;

          const dispatchRes = await this.dispatchAttendeeReminder({
            event,
            attendee,
            stage,
          });

          if (dispatchRes.dispatched) {
            result.remindersDispatched++;
          } else if (dispatchRes.alreadyDispatched) {
            result.alreadyDispatched++;
          } else if (dispatchRes.error) {
            result.errors.push({
              eventId: event._id.toString(),
              userId: attendee.userId,
              error: dispatchRes.error,
            });
          }
        }
      }
    }

    return result;
  }
}

export const reminderService = new ReminderService();
