import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { Event } from "@/models/Event";
import { Booking } from "@/models/Booking";
import { Ticket } from "@/models/Ticket";
import { Announcement } from "@/models/Announcement";
import { EventReminderDispatch } from "@/models/EventReminderDispatch";
import { EmailDelivery } from "@/models/EmailDelivery";
import { reminderService, getEventScheduleKey } from "@/services/reminder.service";
import { announcementService } from "@/services/announcement.service";
import { sendEmail, setEmailMockHandler, SendEmailOptions, SendEmailResult } from "@/lib/email/client";
import { isResendConfigured, isEmailFromConfigured } from "@/config/env";
import { authorizeCronRequest } from "@/lib/auth/cron";
import { USER_ROLES } from "@/constants/roles";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

/**
 * Load .env.local if present in project root
 */
function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let val = trimmed.slice(eqIndex + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadLocalEnv();

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
  passed++;
}

async function runHardeningTests() {
  console.log("\n" + "=".repeat(80));
  console.log("🔒 NOTARI 2.0: PHASE 5.7.1 PRODUCTION RELIABILITY & IDEMPOTENCY AUDIT");
  console.log("=".repeat(80));

  await connectToDatabase();
  console.log("  🔌 Connected to MongoDB Atlas.");

  const testRunId = Date.now();
  const createdUserIds: mongoose.Types.ObjectId[] = [];
  const createdEventIds: mongoose.Types.ObjectId[] = [];
  const createdBookingIds: mongoose.Types.ObjectId[] = [];
  const createdTicketIds: mongoose.Types.ObjectId[] = [];
  const createdAnnouncementIds: mongoose.Types.ObjectId[] = [];
  const createdDispatchIds: mongoose.Types.ObjectId[] = [];
  const createdDeliveryIds: mongoose.Types.ObjectId[] = [];

  // Track dispatched emails in mock handler
  const dispatchedEmails: SendEmailOptions[] = [];
  setEmailMockHandler(async (opts: SendEmailOptions): Promise<SendEmailResult> => {
    dispatchedEmails.push(opts);
    return {
      success: true,
      id: `mock_res_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "mock",
    };
  });

  try {
    // =========================================================================
    // SUITE 1: Production Email Safety & Credential Validation
    // =========================================================================
    console.log("\n▶ 1. Production Email Safety & Fail-Safe Boundaries");

    // Test 1.1: isResendConfigured helper detects valid vs invalid keys
    assert(isResendConfigured() !== undefined, "isResendConfigured helper is callable");
    
    // Test 1.2: isEmailFromConfigured helper validates sender identities
    assert(isEmailFromConfigured() === true, "Default or configured EMAIL_FROM is validated as well-formed");

    // Test 1.3: Simulate production environment with missing RESEND_API_KEY
    setEmailMockHandler(null); // Clear mock handler to test real client code
    const originalNodeEnv = process.env.NODE_ENV;
    const originalResendKey = process.env.RESEND_API_KEY;
    const originalEmailFrom = process.env.EMAIL_FROM;

    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.RESEND_API_KEY;

      const missingKeyResult = await sendEmail({
        to: "student@oauife.edu.ng",
        subject: "Test Production Missing Key",
        html: "<p>Hello</p>",
      });

      assert(missingKeyResult.success === false, "Missing RESEND_API_KEY in production strictly returns success: false");
      assert(missingKeyResult.provider === "resend", "Missing key in production records provider: 'resend'");
      assert(
        Boolean(missingKeyResult.error?.includes("Missing or invalid RESEND_API_KEY")),
        "Descriptive operational error returned for missing production credentials"
      );

      // Test 1.4: Placeholder key in production
      process.env.RESEND_API_KEY = "re_placeholder_dummy_key_123456";
      const placeholderResult = await sendEmail({
        to: "student@oauife.edu.ng",
        subject: "Test Production Placeholder Key",
        html: "<p>Hello</p>",
      });

      assert(placeholderResult.success === false, "Placeholder RESEND_API_KEY in production strictly returns success: false");
      assert(
        Boolean(placeholderResult.error?.includes("Missing or invalid RESEND_API_KEY")),
        "Placeholder key in production produces operational error"
      );

      // Test 1.5: Missing sender identity in production
      process.env.RESEND_API_KEY = "re_live_valid_looking_key_for_test_123456789";
      process.env.EMAIL_FROM = "";
      const missingSenderResult = await sendEmail({
        to: "student@oauife.edu.ng",
        subject: "Test Production Missing Sender",
        html: "<p>Hello</p>",
        from: "",
      });

      assert(missingSenderResult.success === false, "Missing or invalid EMAIL_FROM returns success: false");
      assert(
        Boolean(missingSenderResult.error?.includes("Missing or invalid sender identity")),
        "Clear operational error returned for invalid sender identity"
      );

      // Test 1.6: Development simulation permits mock/simulated dispatch
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      delete process.env.RESEND_API_KEY;
      process.env.EMAIL_FROM = "NOTARI OAU <notifications@notari.oau.edu.ng>";

      const devSimulationResult = await sendEmail({
        to: "student@oauife.edu.ng",
        subject: "Test Dev Simulation",
        html: "<p>Hello Dev</p>",
      });

      assert(devSimulationResult.success === true, "Development environment permits simulated dispatch when key is absent");
      assert(devSimulationResult.provider === "simulated", "Development simulation records provider: 'simulated'");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
      if (originalResendKey !== undefined) process.env.RESEND_API_KEY = originalResendKey;
      else delete process.env.RESEND_API_KEY;
      if (originalEmailFrom !== undefined) process.env.EMAIL_FROM = originalEmailFrom;
      else delete process.env.EMAIL_FROM;

      // Re-register mock handler for remainder of testing
      setEmailMockHandler(async (opts: SendEmailOptions): Promise<SendEmailResult> => {
        dispatchedEmails.push(opts);
        return {
          success: true,
          id: `mock_res_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          provider: "mock",
        };
      });
    }

    // =========================================================================
    // SUITE 2: Event Rescheduling & Schedule-Aware Reminder Idempotency
    // =========================================================================
    console.log("\n▶ 2. Event Rescheduling & Schedule-Aware Reminder Idempotency");

    // Provision test organizer
    const organizer = await User.create({
      name: "Great Ife Tech Organizers",
      email: `organizer_${testRunId}@oauife.edu.ng`,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      faculty: "Technology",
      department: "Computer Science & Engineering",
    });
    createdUserIds.push(organizer._id);

    // Provision test student
    const student = await User.create({
      name: "Obaloluwa Ajekiigbe",
      email: `student_${testRunId}@student.oauife.edu.ng`,
      role: USER_ROLES.STUDENT,
      faculty: "Technology",
      department: "Computer Science & Engineering",
      matricNumber: `CSC/${testRunId.toString().slice(-4)}/001`,
      emailPreferences: {
        eventReminders: true,
        campusAnnouncements: true,
      },
    });
    createdUserIds.push(student._id);

    // Schedule 1: Nov 20, 10:00 AM
    const schedule1Date = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h away
    const event = await Event.create({
      title: `OAU Hackathon & FinTech Summit ${testRunId}`,
      slug: `oau-hackathon-${testRunId}`,
      description: "Annual university hackathon and technology exhibition.",
      category: "Tech & Innovation",
      venue: "Oduduwa Hall Main Auditorium",
      startDate: schedule1Date,
      endDate: new Date(schedule1Date.getTime() + 4 * 60 * 60 * 1000),
      organizerId: organizer._id,
      organizerName: organizer.name,
      status: "published",
      isFree: true,
      scheduleVersion: 1,
      ticketTiers: [
        {
          name: "Standard Access",
          price: 0,
          capacity: 100,
          available: 99,
          maxPerOrder: 1,
        },
      ],
      registeredCount: 1,
    });
    createdEventIds.push(event._id);

    // Create confirmed booking and ticket
    const booking = await Booking.create({
      userId: student._id,
      eventId: event._id,
      ticketTierId: event.ticketTiers[0]._id,
      bookingReference: `BKG-SCHED-${testRunId}`,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
    });
    createdBookingIds.push(booking._id);

    const ticket = await Ticket.create({
      bookingId: booking._id,
      userId: student._id,
      eventId: event._id,
      ticketTierId: event.ticketTiers[0]._id,
      tierName: "Standard Access",
      ticketCode: `NOT-OAU-SCHED-${testRunId}`,
      attendeeName: student.name,
      attendeeEmail: student.email,
      pricePaid: 0,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(ticket._id);

    // Test 2.1: Initial schedule key generation
    const key1 = getEventScheduleKey(event);
    assert(key1.startsWith("v1_"), `Schedule 1 key starts with 'v1_': ${key1}`);

    // Test 2.2: Dispatch Schedule 1 24h reminder
    const attendee = {
      userId: student._id.toString(),
      name: student.name,
      email: student.email,
      bookingReference: booking.bookingReference,
      ticketCodes: [ticket.ticketCode],
    };

    const dispatch1 = await reminderService.dispatchAttendeeReminder({
      event,
      attendee,
      stage: "24h",
    });

    assert(dispatch1.dispatched === true, "Schedule 1 24h reminder dispatches successfully");
    assert(dispatch1.alreadyDispatched === false, "Schedule 1 initial dispatch reports alreadyDispatched: false");

    const record1 = await EventReminderDispatch.findOne({
      eventId: event._id,
      userId: student._id,
      stage: "24h",
      scheduleVersion: 1,
    });
    assert(record1 !== null, "Schedule 1 dispatch record created in MongoDB with scheduleVersion: 1");
    if (record1) createdDispatchIds.push(record1._id);

    // Test 2.3: Second run on Schedule 1 is recognized as duplicate (Idempotency)
    const duplicateDispatch1 = await reminderService.dispatchAttendeeReminder({
      event,
      attendee,
      stage: "24h",
    });
    assert(duplicateDispatch1.dispatched === false, "Duplicate run on Schedule 1 dispatches 0 reminders");
    assert(duplicateDispatch1.alreadyDispatched === true, "Duplicate run correctly returns alreadyDispatched: true");

    // Test 2.4: Reschedule Event to Schedule 2 (New start time)
    const schedule2Date = new Date(Date.now() + 24 * 60 * 60 * 1000 + 7 * 24 * 60 * 60 * 1000); // 7 days later
    event.startDate = schedule2Date;
    await event.save(); // Triggers Mongoose pre-save hook incrementing scheduleVersion to 2!

    assert(event.scheduleVersion === 2, `Pre-save hook incremented scheduleVersion to 2 (got ${event.scheduleVersion})`);
    const key2 = getEventScheduleKey(event);
    assert(key2.startsWith("v2_"), `Schedule 2 key starts with 'v2_': ${key2}`);
    assert(key1 !== key2, "Schedule 1 key and Schedule 2 key are distinct");

    // Test 2.5: Dispatch Schedule 2 24h reminder
    const dispatch2 = await reminderService.dispatchAttendeeReminder({
      event,
      attendee,
      stage: "24h",
    });
    assert(dispatch2.dispatched === true, "Schedule 2 24h reminder dispatches fresh reminder for updated schedule");
    assert(dispatch2.alreadyDispatched === false, "Schedule 2 dispatch reports alreadyDispatched: false");

    // Test 2.6: Verify historical Schedule 1 record was NOT overwritten
    const history1 = await EventReminderDispatch.findOne({
      eventId: event._id,
      userId: student._id,
      stage: "24h",
      scheduleVersion: 1,
    });
    const history2 = await EventReminderDispatch.findOne({
      eventId: event._id,
      userId: student._id,
      stage: "24h",
      scheduleVersion: 2,
    });

    assert(history1 !== null, "Historical Schedule 1 record remains safely preserved in MongoDB");
    assert(history2 !== null, "New Schedule 2 record safely persisted in MongoDB");
    assert(history1?._id.toString() !== history2?._id.toString(), "Schedule 1 and Schedule 2 are separate MongoDB records");
    if (history2) createdDispatchIds.push(history2._id);

    // Test 2.7: Duplicate run on Schedule 2 is safely blocked
    const duplicateDispatch2 = await reminderService.dispatchAttendeeReminder({
      event,
      attendee,
      stage: "24h",
    });
    assert(duplicateDispatch2.dispatched === false, "Duplicate run on Schedule 2 dispatches 0 reminders");
    assert(duplicateDispatch2.alreadyDispatched === true, "Duplicate run on Schedule 2 returns alreadyDispatched: true");

    // Test 2.8: Reschedule again to Schedule 3 (Multiple reschedules)
    const schedule3Date = new Date(Date.now() + 24 * 60 * 60 * 1000 + 14 * 24 * 60 * 60 * 1000); // 14 days later
    event.startDate = schedule3Date;
    await event.save();

    assert(event.scheduleVersion === 3, `Second reschedule incremented scheduleVersion to 3 (got ${event.scheduleVersion})`);
    const dispatch3 = await reminderService.dispatchAttendeeReminder({
      event,
      attendee,
      stage: "24h",
    });
    assert(dispatch3.dispatched === true, "Schedule 3 dispatches fresh reminder for third schedule");

    const totalDispatches = await EventReminderDispatch.countDocuments({
      eventId: event._id,
      userId: student._id,
      stage: "24h",
    });
    assert(totalDispatches === 3, `All 3 historical schedule reminders coexist in MongoDB audit trail (expected 3, got ${totalDispatches})`);

    // =========================================================================
    // SUITE 3: Edge Cases, Cancellations & Refund Exclusions
    // =========================================================================
    console.log("\n▶ 3. Edge Cases, Cancellations & Invalidation Guards");

    // Test 3.1: Cancelled event is excluded from reminder process
    event.status = "cancelled";
    await event.save();

    const cancelledRun = await reminderService.processDueEventReminders({
      referenceDate: new Date(event.startDate.getTime() - 24 * 60 * 60 * 1000),
    });
    assert(cancelledRun.remindersDispatched === 0, "Cancelled event dispatches zero reminders");

    // Restore to published for attendee testing
    event.status = "published";
    await event.save();

    // Test 3.2: Refunded / Invalidated ticket is excluded from eligibility
    ticket.isInvalidated = true;
    await ticket.save();

    const eligibleAfterRefund = await reminderService.getEligibleAttendees(event._id);
    assert(eligibleAfterRefund.length === 0, "Invalidated/refunded ticket attendee is strictly excluded from reminder eligibility");

    // Restore ticket validity
    ticket.isInvalidated = false;
    await ticket.save();

    // =========================================================================
    // SUITE 4: Worker Concurrency & Crash Recovery
    // =========================================================================
    console.log("\n▶ 4. Worker Concurrency & Crash Recovery");

    // Test 4.1: Concurrent workers trying to dispatch Schedule 3 1h reminder simultaneously
    const [workerA, workerB] = await Promise.all([
      reminderService.dispatchAttendeeReminder({ event, attendee, stage: "1h" }),
      reminderService.dispatchAttendeeReminder({ event, attendee, stage: "1h" }),
    ]);

    const dispatchedCount = (workerA.dispatched ? 1 : 0) + (workerB.dispatched ? 1 : 0);
    const alreadyDispatchedCount = (workerA.alreadyDispatched ? 1 : 0) + (workerB.alreadyDispatched ? 1 : 0);

    assert(dispatchedCount === 1, `Exactly 1 concurrent worker succeeded in dispatching reminder (got ${dispatchedCount})`);
    assert(alreadyDispatchedCount === 1, `Exactly 1 concurrent worker was intercepted by atomic idempotency lock (got ${alreadyDispatchedCount})`);

    // Test 4.2: Worker crash recovery on stranded dispatch record
    // Mock an event object with scheduleVersion: 4
    const crashEvent = {
      ...event.toObject(),
      _id: event._id,
      scheduleVersion: 4,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    } as any;

    const crashScheduleKey = getEventScheduleKey(crashEvent);
    const crashIdempotencyKey = `${event._id}:${student._id}:24h:${crashScheduleKey}`;
    const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    const strandedRecord = await EventReminderDispatch.create({
      eventId: event._id,
      userId: student._id,
      stage: "24h",
      scheduleVersion: 4,
      recipientEmail: student.email,
      recipientName: student.name,
      eventTitle: event.title,
      eventStartDate: crashEvent.startDate,
      eventVenue: event.venue,
      inAppSent: false,
      emailSent: false,
      idempotencyKey: crashIdempotencyKey,
      dispatchedAt: pastDate,
    });
    createdDispatchIds.push(strandedRecord._id);

    // A new worker encounters this idempotencyKey
    // It should recover the stranded record and complete notification delivery!
    const recoveryRes = await reminderService.dispatchAttendeeReminder({
      event: crashEvent,
      attendee,
      stage: "24h",
    });

    assert(recoveryRes.dispatched === true, "Crashed worker's stranded reminder was recovered and completed");
    const recoveredDoc = await EventReminderDispatch.findOne({ idempotencyKey: crashIdempotencyKey });
    assert(recoveredDoc?.inAppSent === true, "Recovered record has inAppSent: true");

    // =========================================================================
    // SUITE 5: Cron Authorization & Timing-Safe Security
    // =========================================================================
    console.log("\n▶ 5. Cron Authorization & Timing-Safe Security");

    const testCronSecret = `cron_secret_${testRunId}_secure_token`;
    process.env.CRON_SECRET = testCronSecret;

    // Test 5.1: Valid Bearer token
    const validBearerReq = new NextRequest("http://localhost:3000/api/cron/event-reminders", {
      headers: { authorization: `Bearer ${testCronSecret}` },
    });
    assert(await authorizeCronRequest(validBearerReq) === true, "Cron request with valid Bearer token is authorized");

    // Test 5.2: Valid custom x-cron-secret header
    const validHeaderReq = new NextRequest("http://localhost:3000/api/cron/event-reminders", {
      headers: { "x-cron-secret": testCronSecret },
    });
    assert(await authorizeCronRequest(validHeaderReq) === true, "Cron request with valid x-cron-secret header is authorized");

    // Test 5.3: Invalid token
    const invalidTokenReq = new NextRequest("http://localhost:3000/api/cron/event-reminders", {
      headers: { authorization: "Bearer wrong_secret_token_value" },
    });
    assert(await authorizeCronRequest(invalidTokenReq) === false, "Cron request with invalid token is strictly rejected");

    // Test 5.4: Missing authorization
    const missingAuthReq = new NextRequest("http://localhost:3000/api/cron/event-reminders");
    assert(await authorizeCronRequest(missingAuthReq) === false, "Cron request with missing authorization is strictly rejected");

    // =========================================================================
    // SUITE 6: Announcement Batch Bounding & Atomic Publishing Lock
    // =========================================================================
    console.log("\n▶ 6. Announcement Batch Bounding & Atomic Publishing Lock");

    // Create a scheduled announcement due now
    const scheduledAnnouncement = await Announcement.create({
      title: `OAU Semester Reopening Advisory ${testRunId}`,
      summary: "Important academic schedule notification for the upcoming semester.",
      content: "All students and faculty are advised to review the approved university academic calendar.",
      category: "academic_updates",
      priority: "high",
      targetAudience: { type: "all_students" },
      status: "scheduled",
      scheduledFor: new Date(Date.now() - 60 * 1000), // Due 1 minute ago
      authorId: organizer._id,
      authorRole: "organizer",
      authorName: organizer.name,
    });
    createdAnnouncementIds.push(scheduledAnnouncement._id);

    // Two cron workers running concurrently to publish scheduled announcements
    const [publishA, publishB] = await Promise.all([
      announcementService.publishDueScheduledAnnouncements(),
      announcementService.publishDueScheduledAnnouncements(),
    ]);

    const totalPublished = publishA.publishedCount + publishB.publishedCount;
    assert(totalPublished === 1, `Atomic findOneAndUpdate lock ensures announcement published exactly once across concurrent workers (got ${totalPublished})`);

    const finalAnnouncement = await Announcement.findById(scheduledAnnouncement._id);
    assert(finalAnnouncement?.status === "published", "Scheduled announcement transitioned to 'published'");
    assert(finalAnnouncement?.publishedAt !== undefined, "publishedAt timestamp recorded upon publication");

    // =========================================================================
    // SUITE 7: Vercel Cron Configuration Audit
    // =========================================================================
    console.log("\n▶ 7. Vercel Cron Configuration Audit");

    const vercelConfigPath = path.resolve(process.cwd(), "vercel.json");
    assert(fs.existsSync(vercelConfigPath), "vercel.json exists in project root");

    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, "utf-8"));
    assert(Array.isArray(vercelConfig.crons), "vercel.json defines crons array");
    assert(vercelConfig.crons.length === 3, `vercel.json defines exactly 3 cron jobs (got ${vercelConfig.crons.length})`);

    const reminderCron = vercelConfig.crons.find((c: any) => c.path === "/api/cron/event-reminders");
    assert(reminderCron?.schedule === "*/15 * * * *", `event-reminders schedule matches '*/15 * * * *' (got '${reminderCron?.schedule}')`);

    const announcementCron = vercelConfig.crons.find((c: any) => c.path === "/api/cron/scheduled-announcements");
    assert(announcementCron?.schedule === "*/10 * * * *", `scheduled-announcements schedule matches '*/10 * * * *' (got '${announcementCron?.schedule}')`);

    const retryCron = vercelConfig.crons.find((c: any) => c.path === "/api/cron/email-retries");
    assert(retryCron?.schedule === "*/30 * * * *", `email-retries schedule matches '*/30 * * * *' (got '${retryCron?.schedule}')`);

  } finally {
    // Clean up all test fixtures
    console.log("\n🧹 Cleaning up test artifacts from MongoDB Atlas...");
    await EventReminderDispatch.deleteMany({ _id: { $in: createdDispatchIds } });
    await Announcement.deleteMany({ _id: { $in: createdAnnouncementIds } });
    await Ticket.deleteMany({ _id: { $in: createdTicketIds } });
    await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    await Event.deleteMany({ _id: { $in: createdEventIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log("  ✅ Cleaned up test database records.");
    await mongoose.disconnect();
    console.log("  🔌 Disconnected from MongoDB.");
  }

  console.log("\n" + "=".repeat(80));
  console.log(`📊 PHASE 5.7.1 HARDENING AUDIT: ${passed} PASSED | ${failed} FAILED`);
  console.log("=".repeat(80) + "\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runHardeningTests().catch((err) => {
  console.error("Unhandled test runner exception:", err);
  process.exit(1);
});
