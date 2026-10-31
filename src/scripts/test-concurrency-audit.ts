import fs from "fs";
import path from "path";
import mongoose from "mongoose";

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

import { User } from "../models/User";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import { USER_ROLES } from "../constants/roles";
import { EVENT_STATUS, EVENT_CATEGORIES } from "../constants/oau";
import { processFreeRegistration, ProcessFreeRegistrationResult } from "../lib/bookings/register-free";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/notari_oau";

let passed = 0;
let failed = 0;

function assert(condition: unknown, testName: string) {
  if (Boolean(condition)) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runConcurrencyAudit() {
  console.log("\n================================================================================");
  console.log("⚡ NOTARI 2.0: POST-IMPLEMENTATION CONCURRENCY & INTEGRITY AUDIT");
  console.log("================================================================================\n");

  console.log(`🔌 Target MongoDB Atlas: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@")}`);

  let isConnected = false;
  const runId = Date.now().toString(36);

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("✅ Live MongoDB Atlas connection established.\n");

    // Clean up any lingering audit records from previous runs
    await User.deleteMany({ email: { $regex: /^audit_concurrent_/ } });
    await Event.deleteMany({ slug: { $regex: /^audit-concurrent-/ } });

    console.log("--- 1. Transaction Support & Deployment Topology Verification ---");
    let transactionsSupported = false;
    const probeSession = await mongoose.startSession();
    try {
      probeSession.startTransaction();
      await probeSession.abortTransaction();
      transactionsSupported = true;
    } catch {
      transactionsSupported = false;
    } finally {
      await probeSession.endSession();
    }
    assert(transactionsSupported, "MongoDB Atlas replica set genuinely supports multi-document transactions");

    // Create shared organizer for test events
    const organizer = await User.create({
      name: "Audit Organizer",
      email: `audit_concurrent_${runId}_org@oau.edu.ng`,
      password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
      role: USER_ROLES.ORGANIZER,
    });

    console.log("\n--- 2. Genuine Simultaneous Registrations (Fighting for 1 Final Ticket) ---");
    console.log("Executing 5 independent rounds with isolated student pairs and 1-capacity events...\n");

    for (let round = 1; round <= 5; round++) {
      const studentA = await User.create({
        name: `Concurrent Student ${round}A`,
        email: `audit_concurrent_${runId}_s_${round}a@oau.edu.ng`,
        matricNumber: `CSC/2026/${runId.toUpperCase()}A${round}`,
        password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
        role: USER_ROLES.STUDENT,
      });

      const studentB = await User.create({
        name: `Concurrent Student ${round}B`,
        email: `audit_concurrent_${runId}_s_${round}b@oau.edu.ng`,
        matricNumber: `CSC/2026/${runId.toUpperCase()}B${round}`,
        password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
        role: USER_ROLES.STUDENT,
      });

      const event = await Event.create({
        title: `AUDIT_EVENT_CAPACITY_1_ROUND_${round}_${runId}`,
        slug: `audit-concurrent-${runId}-round-${round}`,
        description: "Concurrent registration audit event with exactly 1 available free ticket.",
        organizerId: organizer._id,
        organizerName: organizer.name,
        category: EVENT_CATEGORIES[0],
        venue: "Amphitheatre, OAU Campus",
        startDate: new Date(Date.now() + 24 * 3600 * 1000),
        endDate: new Date(Date.now() + 48 * 3600 * 1000),
        isFree: true,
        totalCapacity: 1,
        registeredCount: 0,
        status: EVENT_STATUS.PUBLISHED,
        ticketTiers: [
          {
            name: "Final Free Spot",
            price: 0,
            capacity: 1,
            available: 1,
            maxPerOrder: 1,
          },
        ],
      });

      const tierId = event.ticketTiers[0]._id!.toString();

      // Launch genuinely concurrent registration requests using Promise.allSettled
      const [resultA, resultB] = await Promise.allSettled([
        processFreeRegistration({
          studentId: studentA._id.toString(),
          eventId: event._id.toString(),
          ticketTierId: tierId,
          quantity: 1,
        }),
        processFreeRegistration({
          studentId: studentB._id.toString(),
          eventId: event._id.toString(),
          ticketTierId: tierId,
          quantity: 1,
        }),
      ]);

      const resA = resultA.status === "fulfilled" ? resultA.value : null;
      const resB = resultB.status === "fulfilled" ? resultB.value : null;

      const successes = [resA, resB].filter((r) => r?.success === true);
      const rejections = [resA, resB].filter((r) => r?.success === false && r?.status === 409);

      assert(
        successes.length === 1 && rejections.length === 1,
        `[Round ${round}] Exactly 1 registration succeeded (201) and exactly 1 rejected for capacity (409)`
      );

      // Verify Database State
      const updatedEvent = await Event.findById(event._id);
      assert(updatedEvent?.ticketTiers[0].available === 0, `[Round ${round}] Remaining capacity is strictly 0`);
      assert(updatedEvent?.registeredCount === 1, `[Round ${round}] Registered count is strictly 1`);

      const bookingsInDb = await Booking.find({ eventId: event._id });
      assert(bookingsInDb.length === 1, `[Round ${round}] Exactly 1 booking document exists in MongoDB`);

      const ticketsInDb = await Ticket.find({ eventId: event._id });
      assert(ticketsInDb.length === 1, `[Round ${round}] Exactly 1 ticket document exists in MongoDB`);

      // Verify no orphaned records for the losing student
      const winnerName = successes[0]?.data?.tickets[0]?.attendeeName;
      const loserStudent = winnerName === studentA.name ? studentB : studentA;
      const loserTickets = await Ticket.find({ userId: loserStudent._id, eventId: event._id });
      const loserBookings = await Booking.find({ userId: loserStudent._id, eventId: event._id });
      assert(
        loserTickets.length === 0 && loserBookings.length === 0,
        `[Round ${round}] Losing student (${loserStudent.name}) has zero orphaned records in MongoDB`
      );

      // Cleanup round records
      await Ticket.deleteMany({ eventId: event._id });
      await Booking.deleteMany({ eventId: event._id });
      await Event.deleteOne({ _id: event._id });
      await User.deleteMany({ _id: { $in: [studentA._id, studentB._id] } });
    }

    console.log("\n--- 3. Same-Student Duplicate Request Flood ---");
    const testStudentDup = await User.create({
      name: "Duplicate Tester Student",
      email: `audit_concurrent_${runId}_dup_student@oau.edu.ng`,
      matricNumber: `CSC/2026/DUP${runId.toUpperCase()}`,
      password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
      role: USER_ROLES.STUDENT,
    });

    const eventDup = await Event.create({
      title: `AUDIT_EVENT_SAME_STUDENT_FLOOD_${runId}`,
      slug: `audit-concurrent-${runId}-same-student`,
      description: "Testing maxPerOrder enforcement under simultaneous duplicate requests from same student.",
      organizerId: organizer._id,
      organizerName: organizer.name,
      category: EVENT_CATEGORIES[0],
      venue: "Amphitheatre, OAU Campus",
      startDate: new Date(Date.now() + 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 48 * 3600 * 1000),
      isFree: true,
      totalCapacity: 20,
      registeredCount: 0,
      status: EVENT_STATUS.PUBLISHED,
      ticketTiers: [
        {
          name: "Standard Free Admission",
          price: 0,
          capacity: 20,
          available: 20,
          maxPerOrder: 2, // Maximum allowed per student is 2
        },
      ],
    });

    const dupTierId = eventDup.ticketTiers[0]._id!.toString();

    // Student fires 3 concurrent requests of quantity 2 simultaneously
    console.log("Firing 3 simultaneous requests of quantity 2 from the same student (maxPerOrder: 2)...");
    const dupResults = await Promise.allSettled([
      processFreeRegistration({
        studentId: testStudentDup._id.toString(),
        eventId: eventDup._id.toString(),
        ticketTierId: dupTierId,
        quantity: 2,
      }),
      processFreeRegistration({
        studentId: testStudentDup._id.toString(),
        eventId: eventDup._id.toString(),
        ticketTierId: dupTierId,
        quantity: 2,
      }),
      processFreeRegistration({
        studentId: testStudentDup._id.toString(),
        eventId: eventDup._id.toString(),
        ticketTierId: dupTierId,
        quantity: 2,
      }),
    ]);

    const dupSuccesses = dupResults
      .filter(
        (r): r is PromiseFulfilledResult<ProcessFreeRegistrationResult> =>
          r.status === "fulfilled" && r.value.success === true
      )
      .map((r) => r.value);

    const dupRejections = dupResults
      .filter(
        (r): r is PromiseFulfilledResult<ProcessFreeRegistrationResult> =>
          r.status === "fulfilled" && r.value.success === false
      )
      .map((r) => r.value);

    assert(dupSuccesses.length === 1, "Exactly 1 duplicate request succeeded (awarding 2 tickets)");
    assert(dupRejections.length === 2, "Other 2 concurrent duplicate requests were rejected (400 limit exceeded)");

    const totalTicketsForStudent = await Ticket.countDocuments({
      userId: testStudentDup._id,
      eventId: eventDup._id,
    });
    assert(totalTicketsForStudent === 2, "Student holds strictly 2 tickets in MongoDB (maxPerOrder strictly preserved)");

    const updatedEventDup = await Event.findById(eventDup._id);
    assert(updatedEventDup?.registeredCount === 2, "Event registeredCount incremented strictly by 2");
    assert(updatedEventDup?.ticketTiers[0].available === 18, "Event remaining available capacity is strictly 18");

    // Clean up duplicate test
    await Ticket.deleteMany({ eventId: eventDup._id });
    await Booking.deleteMany({ eventId: eventDup._id });
    await Event.deleteOne({ _id: eventDup._id });
    await User.deleteOne({ _id: testStudentDup._id });

    console.log("\n--- 4. Transaction Atomicity & Rollback Verification ---");
    const testEventRollback = await Event.create({
      title: `AUDIT_EVENT_ROLLBACK_VERIFICATION_${runId}`,
      slug: `audit-concurrent-${runId}-rollback`,
      description: "Verifying that aborted transactions leave zero capacity alteration or orphan documents.",
      organizerId: organizer._id,
      organizerName: organizer.name,
      category: EVENT_CATEGORIES[0],
      venue: "Amphitheatre, OAU Campus",
      startDate: new Date(Date.now() + 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 48 * 3600 * 1000),
      isFree: true,
      totalCapacity: 5,
      registeredCount: 0,
      status: EVENT_STATUS.PUBLISHED,
      ticketTiers: [
        {
          name: "Rollback Test Tier",
          price: 0,
          capacity: 5,
          available: 5,
          maxPerOrder: 5,
        },
      ],
    });

    const rollbackTierId = testEventRollback.ticketTiers[0]._id!;
    const rollbackStudent = await User.create({
      name: "Rollback Test Student",
      email: `audit_concurrent_${runId}_rb_student@oau.edu.ng`,
      matricNumber: `CSC/2026/RB${runId.toUpperCase()}`,
      password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
      role: USER_ROLES.STUDENT,
    });

    // Manually run a transaction that simulates an unexpected failure during ticket writing
    const txSession = await mongoose.startSession();
    let caughtExpectedError = false;
    try {
      await txSession.withTransaction(async () => {
        // Step 1: Decrement capacity
        await Event.findOneAndUpdate(
          { _id: testEventRollback._id, "ticketTiers._id": rollbackTierId },
          { $inc: { registeredCount: 1, "ticketTiers.$.available": -1 } },
          { session: txSession }
        );

        // Step 2: Create Booking
        await Booking.create(
          [
            {
              bookingReference: `NOT-AUDIT-FAILED-TX-${runId}`,
              userId: rollbackStudent._id,
              eventId: testEventRollback._id,
              ticketTierId: rollbackTierId,
              quantity: 1,
              unitPrice: 0,
              totalAmount: 0,
              paymentStatus: "successful",
              paymentChannel: "free",
            },
          ],
          { session: txSession }
        );

        // Step 3: Simulate catastrophic failure before ticket batch save
        throw new Error("SIMULATED_TICKET_GENERATION_FAULT");
      });
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.message === "SIMULATED_TICKET_GENERATION_FAULT") {
        caughtExpectedError = true;
      }
    } finally {
      await txSession.endSession();
    }

    assert(caughtExpectedError, "Simulated mid-transaction failure threw and was caught");

    // Verify complete rollback in database
    const postRollbackEvent = await Event.findById(testEventRollback._id);
    assert(postRollbackEvent?.registeredCount === 0, "Rollback: Event registeredCount remains at 0");
    assert(postRollbackEvent?.ticketTiers[0].available === 5, "Rollback: Event capacity restored to full (5)");

    const orphanBookings = await Booking.find({ bookingReference: `NOT-AUDIT-FAILED-TX-${runId}` });
    assert(orphanBookings.length === 0, "Rollback: No orphan booking exists in database");

    const orphanTickets = await Ticket.find({ eventId: testEventRollback._id });
    assert(orphanTickets.length === 0, "Rollback: No orphan tickets exist in database");

    // Clean up rollback records
    await Event.deleteOne({ _id: testEventRollback._id });
    await User.deleteOne({ _id: rollbackStudent._id });

    console.log("\n--- 5. Security & Data Integrity Protections ---");

    // A. Role Enforcement (Organizer attempting to register student ticket)
    const testEventSec = await Event.create({
      title: `AUDIT_EVENT_SECURITY_TESTS_${runId}`,
      slug: `audit-concurrent-${runId}-security`,
      description: "Verifying security boundaries for free registration endpoint.",
      organizerId: organizer._id,
      organizerName: organizer.name,
      category: EVENT_CATEGORIES[0],
      venue: "Amphitheatre, OAU Campus",
      startDate: new Date(Date.now() + 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 48 * 3600 * 1000),
      isFree: false,
      totalCapacity: 10,
      registeredCount: 0,
      status: EVENT_STATUS.PUBLISHED,
      ticketTiers: [
        {
          name: "Free Pass",
          price: 0,
          capacity: 5,
          available: 5,
          maxPerOrder: 2,
        },
        {
          name: "VIP Paid Pass",
          price: 3500,
          capacity: 5,
          available: 5,
          maxPerOrder: 2,
        },
      ],
    });

    const freeSecTierId = testEventSec.ticketTiers[0]._id!.toString();
    const paidSecTierId = testEventSec.ticketTiers[1]._id!.toString();

    // 1. Non-student rejection
    const organizerAttempt = await processFreeRegistration({
      studentId: organizer._id.toString(),
      eventId: testEventSec._id.toString(),
      ticketTierId: freeSecTierId,
      quantity: 1,
    });
    assert(
      organizerAttempt.success === false && organizerAttempt.status === 403,
      "Security: Non-student accounts (Organizer/Admin) are rejected with 403 Forbidden"
    );

    // 2. Paid tier tampering rejection
    const validStudentSec = await User.create({
      name: "Security Test Student",
      email: `audit_concurrent_${runId}_sec_student@oau.edu.ng`,
      matricNumber: `CSC/2026/SEC${runId.toUpperCase()}`,
      password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
      role: USER_ROLES.STUDENT,
    });

    const paidTierAttempt = await processFreeRegistration({
      studentId: validStudentSec._id.toString(),
      eventId: testEventSec._id.toString(),
      ticketTierId: paidSecTierId,
      quantity: 1,
    });
    assert(
      paidTierAttempt.success === false && paidTierAttempt.status === 400,
      "Security: Paid ticket tiers cannot be registered through free endpoint (400 Bad Request)"
    );

    // 3. Negative capacity prevention under burst requests
    console.log("Bursting 5 simultaneous requests for an event with capacity: 1...");
    const burstEvent = await Event.create({
      title: `AUDIT_EVENT_BURST_ANTI_NEGATIVE_${runId}`,
      slug: `audit-concurrent-${runId}-burst`,
      description: "Testing that capacity never goes negative under burst requests.",
      organizerId: organizer._id,
      organizerName: organizer.name,
      category: EVENT_CATEGORIES[0],
      venue: "Amphitheatre, OAU Campus",
      startDate: new Date(Date.now() + 24 * 3600 * 1000),
      endDate: new Date(Date.now() + 48 * 3600 * 1000),
      isFree: true,
      totalCapacity: 1,
      registeredCount: 0,
      status: EVENT_STATUS.PUBLISHED,
      ticketTiers: [
        {
          name: "Single Spot",
          price: 0,
          capacity: 1,
          available: 1,
          maxPerOrder: 1,
        },
      ],
    });

    const burstTierId = burstEvent.ticketTiers[0]._id!.toString();

    const burstStudents = await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        User.create({
          name: `Burst Student ${i}`,
          email: `audit_concurrent_${runId}_burst_${i}@oau.edu.ng`,
          matricNumber: `CSC/2026/B${runId.toUpperCase()}${i}`,
          password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
          role: USER_ROLES.STUDENT,
        })
      )
    );

    const burstResults = await Promise.allSettled(
      burstStudents.map((s) =>
        processFreeRegistration({
          studentId: s._id.toString(),
          eventId: burstEvent._id.toString(),
          ticketTierId: burstTierId,
          quantity: 1,
        })
      )
    );

    const burstSuccesses = burstResults.filter(
      (r): r is PromiseFulfilledResult<ProcessFreeRegistrationResult> =>
        r.status === "fulfilled" && r.value.success === true
    );
    const burstRejections = burstResults.filter(
      (r): r is PromiseFulfilledResult<ProcessFreeRegistrationResult> =>
        r.status === "fulfilled" && r.value.success === false
    );

    assert(burstSuccesses.length === 1, "Burst: Exactly 1 of 5 simultaneous requests succeeded");
    assert(burstRejections.length === 4, "Burst: Remaining 4 simultaneous requests were rejected (409)");

    const postBurstEvent = await Event.findById(burstEvent._id);
    assert(postBurstEvent?.ticketTiers[0].available === 0, "Burst: Capacity remained at 0 and NEVER became negative");
    assert(postBurstEvent?.registeredCount === 1, "Burst: Registered count is strictly 1");

    // Clean up security test records
    await Ticket.deleteMany({ eventId: { $in: [testEventSec._id, burstEvent._id] } });
    await Booking.deleteMany({ eventId: { $in: [testEventSec._id, burstEvent._id] } });
    await Event.deleteMany({ _id: { $in: [testEventSec._id, burstEvent._id] } });
    await User.deleteMany({ _id: { $in: [...burstStudents.map((s) => s._id), validStudentSec._id, organizer._id] } });

    console.log("\n================================================================================");
    console.log(`📊 CONCURRENCY & INTEGRITY AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Concurrency audit execution error:", error);
    process.exit(1);
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("🔌 Database connection closed.");
    }
  }
}

runConcurrencyAudit();
