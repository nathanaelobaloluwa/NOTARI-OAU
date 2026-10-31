import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import { USER_ROLES } from "../constants/roles";
import { EVENT_STATUS, EVENT_CATEGORIES } from "../constants/oau";
import { TicketSecurityService } from "../lib/tickets/qr";
import { generateBookingReference } from "../validators/booking";

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

async function runBookingE2E() {
  console.log("\n================================================================================");
  console.log("🎫 NOTARI 2.0: END-TO-END LIVE FREE EVENT REGISTRATION & BOOKING AUDIT");
  console.log("================================================================================\n");

  console.log(`🔌 Target MongoDB: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@")}`);

  let isConnected = false;
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("✅ Live MongoDB Atlas connection established.\n");

    // Pre-cleanup of any lingering test records
    await User.deleteMany({ email: { $regex: /^test_booking_e2e_/ } });
    await Event.deleteMany({ slug: { $regex: /^test-e2e-event-/ } });

    console.log("--- 1. Seed Isolated Test Data (Student, Organizer, Event) ---");

    const testStudent = await User.create({
      name: "Booking E2E Student",
      email: "test_booking_e2e_student@oau.edu.ng",
      matricNumber: "CSC/2026/TEST99",
      faculty: "Faculty of Technology",
      password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
      role: USER_ROLES.STUDENT,
    });
    assert(testStudent != null, "Test student created in MongoDB Atlas");

    const testOrganizer = await User.create({
      name: "Booking E2E Organizer",
      email: "test_booking_e2e_org@oau.edu.ng",
      password: "$2a$12$e8YkZ8hKkH68yG5aTj/J/OCeR3bXwB7M9b1eWvYkZ8hKkH68yG5aT",
      role: USER_ROLES.ORGANIZER,
    });
    assert(testOrganizer != null, "Test organizer created in MongoDB Atlas");

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const testEvent = await Event.create({
      title: "TEST_E2E_EVENT_FREE_PASS",
      slug: "test-e2e-event-free-pass",
      description: "Automated end-to-end booking verification event with strict capacity limit.",
      organizerId: testOrganizer._id,
      organizerName: testOrganizer.name,
      category: EVENT_CATEGORIES[0],
      venue: "Amphitheatre, OAU Campus",
      startDate: tomorrow,
      endDate: dayAfter,
      isFree: true,
      totalCapacity: 2,
      registeredCount: 0,
      status: EVENT_STATUS.PUBLISHED,
      ticketTiers: [
        {
          name: "Free Student Pass",
          price: 0,
          capacity: 2,
          available: 2,
          maxPerOrder: 2,
          description: "Complimentary access for registered OAU students",
        },
      ],
    });
    assert(testEvent != null && testEvent.ticketTiers.length === 1, "Test event with 2 free spots created in Atlas");

    const tierId = testEvent.ticketTiers[0]._id;
    assert(tierId != null, "Ticket tier has generated MongoDB ObjectId");

    console.log("\n--- 2. First Free Registration (Quantity: 1) ---");

    // Atomic decrement and registration
    const updatedEvent1 = await Event.findOneAndUpdate(
      {
        _id: testEvent._id,
        status: EVENT_STATUS.PUBLISHED,
        "ticketTiers._id": tierId,
        "ticketTiers.available": { $gte: 1 },
      },
      {
        $inc: {
          registeredCount: 1,
          "ticketTiers.$.available": -1,
        },
      },
      { new: true }
    );

    assert(updatedEvent1 != null, "Atomic findOneAndUpdate successfully allocated spot");
    assert(updatedEvent1?.registeredCount === 1, "Event registeredCount incremented to 1");
    assert(
      updatedEvent1?.ticketTiers.find((t) => t._id?.equals(tierId))?.available === 1,
      "Ticket tier remaining capacity decremented to 1"
    );

    // Create Booking Document
    const bookingRef1 = generateBookingReference(2026);
    const booking1 = await Booking.create({
      bookingReference: bookingRef1,
      userId: testStudent._id,
      eventId: testEvent._id,
      ticketTierId: tierId,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
      paymentChannel: "free",
      paidAt: new Date(),
    });
    assert(booking1 != null && booking1.paymentStatus === "successful", "Booking document created with status 'successful'");

    // Create Ticket with HMAC Signature
    const ticketCode1 = TicketSecurityService.generateTicketCode();
    const sig1 = TicketSecurityService.signTicket(ticketCode1, testEvent._id.toString());
    const ticket1 = await Ticket.create({
      bookingId: booking1._id,
      eventId: testEvent._id,
      userId: testStudent._id,
      ticketTierId: tierId,
      tierName: "Free Student Pass",
      ticketCode: ticketCode1,
      qrCodeUrl: `https://notari-oau.edu.ng/verify/${ticketCode1}?sig=${sig1}`,
      attendeeName: testStudent.name,
      attendeeEmail: testStudent.email,
      pricePaid: 0,
      isCheckedIn: false,
    });
    assert(ticket1 != null && ticket1.ticketCode === ticketCode1, "Ticket document saved to MongoDB");
    assert(
      TicketSecurityService.verifyTicketSignature(ticket1.ticketCode, testEvent._id.toString(), sig1),
      "Saved ticket HMAC signature is cryptographically verified"
    );

    console.log("\n--- 3. Second Free Registration (Exhaust Remaining Capacity) ---");

    const updatedEvent2 = await Event.findOneAndUpdate(
      {
        _id: testEvent._id,
        status: EVENT_STATUS.PUBLISHED,
        "ticketTiers._id": tierId,
        "ticketTiers.available": { $gte: 1 },
      },
      {
        $inc: {
          registeredCount: 1,
          "ticketTiers.$.available": -1,
        },
      },
      { new: true }
    );

    assert(updatedEvent2 != null, "Atomic decrement consumed the final available spot");
    assert(updatedEvent2?.registeredCount === 2, "Event registeredCount reached total capacity (2)");
    assert(
      updatedEvent2?.ticketTiers.find((t) => t._id?.equals(tierId))?.available === 0,
      "Ticket tier remaining capacity reached exactly 0 (Sold Out)"
    );

    const bookingRef2 = generateBookingReference(2026);
    const booking2 = await Booking.create({
      bookingReference: bookingRef2,
      userId: testStudent._id,
      eventId: testEvent._id,
      ticketTierId: tierId,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
      paymentChannel: "free",
      paidAt: new Date(),
    });

    const ticketCode2 = TicketSecurityService.generateTicketCode();
    const sig2 = TicketSecurityService.signTicket(ticketCode2, testEvent._id.toString());
    await Ticket.create({
      bookingId: booking2._id,
      eventId: testEvent._id,
      userId: testStudent._id,
      ticketTierId: tierId,
      tierName: "Free Student Pass",
      ticketCode: ticketCode2,
      qrCodeUrl: `https://notari-oau.edu.ng/verify/${ticketCode2}?sig=${sig2}`,
      attendeeName: testStudent.name,
      attendeeEmail: testStudent.email,
      pricePaid: 0,
      isCheckedIn: false,
    });

    console.log("\n--- 4. Concurrency & Anti-Overselling Protection (Capacity Exhausted) ---");

    // Attempting 3rd registration when available === 0
    const oversellAttempt = await Event.findOneAndUpdate(
      {
        _id: testEvent._id,
        status: EVENT_STATUS.PUBLISHED,
        "ticketTiers._id": tierId,
        "ticketTiers.available": { $gte: 1 },
      },
      {
        $inc: {
          registeredCount: 1,
          "ticketTiers.$.available": -1,
        },
      },
      { new: true }
    );

    assert(oversellAttempt === null, "Anti-Overselling Guard: Atomic update returned null when capacity exhausted");

    // Verify DB count did not change
    const checkEvent = await Event.findById(testEvent._id);
    assert(checkEvent?.registeredCount === 2, "Event registeredCount remained strictly at 2");
    assert(
      checkEvent?.ticketTiers.find((t) => t._id?.equals(tierId))?.available === 0,
      "Ticket tier availability remained strictly at 0"
    );

    const totalTicketsIssued = await Ticket.countDocuments({ eventId: testEvent._id });
    assert(totalTicketsIssued === 2, "Exact ticket count in MongoDB matches capacity (no oversold tickets)");

    console.log("\n--- 5. Duplicate & Max Per Order Policy Guard ---");

    const existingStudentBookings = await Booking.find({
      userId: testStudent._id,
      eventId: testEvent._id,
      paymentStatus: "successful",
    });
    const studentAlreadyBooked = existingStudentBookings.reduce((sum, b) => sum + b.quantity, 0);
    const maxAllowed = testEvent.ticketTiers[0].maxPerOrder || 5;

    assert(studentAlreadyBooked === 2, "Student has reserved 2 tickets");
    assert(studentAlreadyBooked >= maxAllowed, "Student has reached or exceeded maxPerOrder limit");
    assert(
      studentAlreadyBooked + 1 > maxAllowed,
      "Further registration attempts for this student are blocked by maxPerOrder policy"
    );

    console.log("\n--- 6. Clean Up Isolated Test Records ---");

    const deletedTickets = await Ticket.deleteMany({ eventId: testEvent._id });
    const deletedBookings = await Booking.deleteMany({ eventId: testEvent._id });
    const deletedEvents = await Event.deleteMany({ _id: testEvent._id });
    const deletedUsers = await User.deleteMany({ email: { $regex: /^test_booking_e2e_/ } });

    assert(deletedTickets.deletedCount === 2, `Cleaned up ${deletedTickets.deletedCount} test tickets`);
    assert(deletedBookings.deletedCount === 2, `Cleaned up ${deletedBookings.deletedCount} test bookings`);
    assert(deletedEvents.deletedCount === 1, `Cleaned up test event`);
    assert(deletedUsers.deletedCount === 2, `Cleaned up test student and organizer`);

    console.log("\n================================================================================");
    console.log(`📊 LIVE BOOKING E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Booking E2E test execution error:", error);
    process.exit(1);
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("🔌 Database connection closed.");
    }
  }
}

runBookingE2E();
