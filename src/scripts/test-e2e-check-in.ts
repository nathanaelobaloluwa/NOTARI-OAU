import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { EVENT_STATUS } from "../constants/oau";
import { TicketSecurityService } from "../lib/tickets/qr";
import {
  verifyAndCheckInTicket,
  getEventCheckInStats,
  getEventAttendees,
} from "../lib/tickets/check-in";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
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

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failCount++;
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runCheckInE2E() {
  console.log("\n================================================================================");
  console.log("🎟️ NOTARI 2.0: END-TO-END GATE CHECK-IN & SECURE QR SCANNING AUDIT (PHASE 5.5)");
  console.log("================================================================================\n");

  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/notari_oau";
  console.log(`🔌 Target MongoDB: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ":***@")}`);

  await mongoose.connect(mongoUri);
  console.log(" Connected to MongoDB successfully.\n");

  const runId = Math.random().toString(36).substring(2, 8);
  const passwordHash = await bcrypt.hash("OauStudentPass2026!", 10);

  // Track created entities for teardown
  const createdUserIds: mongoose.Types.ObjectId[] = [];
  const createdEventIds: mongoose.Types.ObjectId[] = [];
  const createdBookingIds: mongoose.Types.ObjectId[] = [];
  const createdTicketIds: mongoose.Types.ObjectId[] = [];

  try {
    // -------------------------------------------------------------------------
    // 0. FIXTURE SETUP
    // -------------------------------------------------------------------------
    // Organizer 1 (Owner of Event 1)
    const organizerUser = await User.create({
      name: `OAU Tech Club CheckIn ${runId}`,
      email: `techclub-${runId}@notari.oau.edu.ng`,
      passwordHash,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      isEmailVerified: true,
    });
    createdUserIds.push(organizerUser._id);

    await OrganizerProfile.create({
      userId: organizerUser._id,
      organizationName: `OAU Tech Club ${runId}`,
      organizerType: "organization",
      category: "Association",
      description: "Official OAU Tech Innovation and Software Club",
      contactEmail: organizerUser.email,
      contactPhone: "+2348012345678",
      status: ORGANIZER_STATUS.APPROVED,
      approvedAt: new Date(),
    });

    // Organizer 2 (Owner of Event 2)
    const organizerUser2 = await User.create({
      name: `Great Ife Law Society ${runId}`,
      email: `lawsociety-${runId}@notari.oau.edu.ng`,
      passwordHash,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      isEmailVerified: true,
    });
    createdUserIds.push(organizerUser2._id);

    // Superadmin User
    const adminUser = await User.create({
      name: `Gate Supervisor Admin ${runId}`,
      email: `supervisor-${runId}@notari.oau.edu.ng`,
      passwordHash,
      role: USER_ROLES.ADMIN,
      isOrganizer: true,
      isEmailVerified: true,
    });
    createdUserIds.push(adminUser._id);

    // Regular Student (Unauthorized Operator)
    const regularStudent = await User.create({
      name: `Adeola Attendee ${runId}`,
      email: `adeola-${runId}@student.oauife.edu.ng`,
      passwordHash,
      role: USER_ROLES.STUDENT,
      isOrganizer: false,
      isEmailVerified: true,
    });
    createdUserIds.push(regularStudent._id);

    // Event 1 (Tech Summit at Oduduwa Hall)
    const eventTierId1 = new mongoose.Types.ObjectId();
    const event1 = await Event.create({
      title: `Great Ife CodeFest ${runId}`,
      slug: `great-ife-codefest-${runId}`,
      description: "Annual university hackathon and software festival",
      category: "Tech & Innovation",
      status: EVENT_STATUS.PUBLISHED,
      organizerId: organizerUser._id,
      organizerName: organizerUser.name,
      venue: "Oduduwa Hall",
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      totalCapacity: 500,
      registeredCount: 3,
      isFree: false,
      ticketTiers: [
        {
          _id: eventTierId1,
          name: "Standard VIP",
          price: 2500,
          capacity: 200,
          available: 197,
        },
      ],
    });
    createdEventIds.push(event1._id);

    // Event 2 (Law Dinner at Amphitheatre)
    const event2 = await Event.create({
      title: `Great Ife Law Dinner ${runId}`,
      slug: `great-ife-law-dinner-${runId}`,
      description: "Annual law students gala night",
      category: "Social & Entertainment",
      status: EVENT_STATUS.PUBLISHED,
      organizerId: organizerUser2._id,
      organizerName: organizerUser2.name,
      venue: "Amphitheatre",
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      totalCapacity: 300,
      registeredCount: 0,
      isFree: false,
      ticketTiers: [
        {
          name: "Dinner Pass",
          price: 5000,
          capacity: 300,
          available: 300,
        },
      ],
    });
    createdEventIds.push(event2._id);

    // Booking 1 for Event 1
    const booking1 = await Booking.create({
      bookingReference: `NOT-2026-CHK-${runId}`,
      userId: regularStudent._id,
      eventId: event1._id,
      organizerId: organizerUser._id,
      ticketTierId: eventTierId1,
      quantity: 3,
      unitPrice: 2500,
      totalAmount: 7500,
      paymentStatus: "successful",
      paymentReference: `NOT-PAY-CHK-${runId}`,
      paymentChannel: "paystack",
    });
    createdBookingIds.push(booking1._id);

    // Ticket 1: Valid un-checked ticket for Event 1
    const ticketCode1 = TicketSecurityService.generateTicketCode();
    const sig1 = TicketSecurityService.signTicket(ticketCode1, event1._id.toString());
    const ticket1 = await Ticket.create({
      bookingId: booking1._id,
      eventId: event1._id,
      userId: regularStudent._id,
      ticketTierId: eventTierId1,
      tierName: "Standard VIP",
      ticketCode: ticketCode1,
      attendeeName: "Adeola Johnson",
      attendeeEmail: regularStudent.email,
      pricePaid: 2500,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(ticket1._id);

    // Ticket 2: Invalidated / Refunded ticket
    const ticketCode2 = TicketSecurityService.generateTicketCode();
    const sig2 = TicketSecurityService.signTicket(ticketCode2, event1._id.toString());
    const ticket2 = await Ticket.create({
      bookingId: booking1._id,
      eventId: event1._id,
      userId: regularStudent._id,
      ticketTierId: eventTierId1,
      tierName: "Standard VIP",
      ticketCode: ticketCode2,
      attendeeName: "Babatunde Lawal",
      attendeeEmail: "babatunde@notari.oau.edu.ng",
      pricePaid: 2500,
      isCheckedIn: false,
      isInvalidated: true,
      invalidatedAt: new Date(),
      invalidatedReason: "Refunded via Paystack on student request",
    });
    createdTicketIds.push(ticket2._id);

    // Ticket 3: Valid un-checked ticket for concurrency testing
    const ticketCode3 = TicketSecurityService.generateTicketCode();
    const sig3 = TicketSecurityService.signTicket(ticketCode3, event1._id.toString());
    const ticket3 = await Ticket.create({
      bookingId: booking1._id,
      eventId: event1._id,
      userId: regularStudent._id,
      ticketTierId: eventTierId1,
      tierName: "Standard VIP",
      ticketCode: ticketCode3,
      attendeeName: "Chidinma Okafor",
      attendeeEmail: "chidinma@notari.oau.edu.ng",
      pricePaid: 2500,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(ticket3._id);

    // -------------------------------------------------------------------------
    // SUITE 1: Valid Ticket Check-in & First Admission
    // -------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("🎫 SUITE 1: Valid Ticket Check-in & First Admission");
    console.log("--------------------------------------------------------------------------------");

    const checkInRes1 = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCode1,
      operatorId: organizerUser._id.toString(),
      signature: sig1,
      scanMode: "qr",
    });

    assert(checkInRes1.success === true, "Valid ticket scan successfully admits attendee");
    assert(checkInRes1.status === 200, "Returns HTTP 200 OK on successful check-in");
    assert(checkInRes1.code === "SUCCESS", "Returns SUCCESS response code");
    assert(checkInRes1.ticket?.isCheckedIn === true, "Returned ticket has isCheckedIn=true");
    assert(Boolean(checkInRes1.ticket?.checkedInAt), "Check-in timestamp is set");
    assert(checkInRes1.ticket?.attendeeName === "Adeola Johnson", "Returns correct attendee name");

    // Verify database record is actually updated
    const dbTicket1 = await Ticket.findById(ticket1._id);
    assert(dbTicket1?.isCheckedIn === true, "Database record is updated to isCheckedIn=true");
    assert(dbTicket1?.checkedInBy?.toString() === organizerUser._id.toString(), "CheckedInBy references organizer ID");

    // -------------------------------------------------------------------------
    // SUITE 2: Cryptographic Signature & Anti-Forgery Boundary
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🔒 SUITE 2: Cryptographic Signature & Anti-Forgery Boundary");
    console.log("--------------------------------------------------------------------------------");

    // Test with forged signature on an un-checked ticket
    const ticketCodeForgery = TicketSecurityService.generateTicketCode();
    const forgedSig = "deadbeef12345678";
    const forgeryTicket = await Ticket.create({
      bookingId: booking1._id,
      eventId: event1._id,
      userId: regularStudent._id,
      ticketTierId: eventTierId1,
      tierName: "Standard VIP",
      ticketCode: ticketCodeForgery,
      attendeeName: "Fake Attendee",
      attendeeEmail: "fake@notari.oau.edu.ng",
      pricePaid: 2500,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(forgeryTicket._id);

    const forgedRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCodeForgery,
      operatorId: organizerUser._id.toString(),
      signature: forgedSig,
      scanMode: "qr",
    });

    assert(forgedRes.success === false, "Forged QR signature is rejected");
    assert(forgedRes.status === 400, "Returns HTTP 400 on forged signature");
    assert(forgedRes.code === "INVALID_SIGNATURE", "Returns INVALID_SIGNATURE code");

    // Verify ticket remains un-admitted
    const dbForgery = await Ticket.findById(forgeryTicket._id);
    assert(dbForgery?.isCheckedIn === false, "Ticket remains un-admitted after signature failure");

    // -------------------------------------------------------------------------
    // SUITE 3: Event-Scoped Validation & Cross-Event Rejection
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🎪 SUITE 3: Event-Scoped Validation & Cross-Event Rejection");
    console.log("--------------------------------------------------------------------------------");

    // Attempt to use Ticket 3 (issued for Event 1) at Event 2's gate
    const sigCrossEvent = TicketSecurityService.signTicket(ticketCode3, event1._id.toString());
    const crossEventRes = await verifyAndCheckInTicket({
      eventId: event2._id.toString(),
      ticketCode: ticketCode3,
      operatorId: organizerUser2._id.toString(), // Organizer of Event 2
      signature: sigCrossEvent,
      scanMode: "qr",
    });

    assert(crossEventRes.success === false, "Ticket from Event 1 cannot be used for Event 2");
    assert(crossEventRes.status === 400, "Returns HTTP 400 on cross-event attempt");
    assert(crossEventRes.code === "EVENT_MISMATCH", "Returns EVENT_MISMATCH code");

    // -------------------------------------------------------------------------
    // SUITE 4: Voided, Cancelled & Refunded Tickets Guard
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🚫 SUITE 4: Voided, Cancelled & Refunded Tickets Guard");
    console.log("--------------------------------------------------------------------------------");

    const refundCheckInRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCode2,
      operatorId: organizerUser._id.toString(),
      signature: sig2,
      scanMode: "qr",
    });

    assert(refundCheckInRes.success === false, "Refunded ticket is strictly rejected at the gate");
    assert(refundCheckInRes.status === 400, "Returns HTTP 400 on refunded ticket");
    assert(refundCheckInRes.code === "INVALIDATED_TICKET", "Returns INVALIDATED_TICKET code");
    assert(refundCheckInRes.ticket?.isInvalidated === true, "Identifies ticket as invalidated");

    // -------------------------------------------------------------------------
    // SUITE 5: Immediate Duplicate Scan Rejection (Anti-Gatecrashing)
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🔁 SUITE 5: Immediate Duplicate Scan Rejection (Anti-Gatecrashing)");
    console.log("--------------------------------------------------------------------------------");

    // Rescan Ticket 1 which was admitted in Suite 1
    const duplicateRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCode1,
      operatorId: organizerUser._id.toString(),
      signature: sig1,
      scanMode: "qr",
    });

    assert(duplicateRes.success === false, "Rescanning admitted ticket is rejected");
    assert(duplicateRes.status === 409, "Returns HTTP 409 Conflict on duplicate scan");
    assert(duplicateRes.code === "ALREADY_CHECKED_IN", "Returns ALREADY_CHECKED_IN code");
    assert(Boolean(duplicateRes.ticket?.checkedInAt), "Returns original check-in timestamp");
    assert(duplicateRes.message.includes("Duplicate entrance prevented"), "Returns clear duplicate admission message");

    // -------------------------------------------------------------------------
    // SUITE 6: Multi-Tenant Authorization & Privilege Boundaries
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🛡️ SUITE 6: Multi-Tenant Authorization & Privilege Boundaries");
    console.log("--------------------------------------------------------------------------------");

    // 6.1 Regular student cannot act as door operator
    const studentAsOperatorRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCode3,
      operatorId: regularStudent._id.toString(),
      signature: sig3,
      scanMode: "qr",
    });
    assert(studentAsOperatorRes.success === false, "Unaccredited student is rejected from checking in attendees");
    assert(studentAsOperatorRes.status === 403, "Returns HTTP 403 Forbidden for unauthorized operator");
    assert(studentAsOperatorRes.code === "UNAUTHORIZED", "Returns UNAUTHORIZED code");

    // 6.2 Organizer 2 cannot check in attendees for Organizer 1's event
    const crossOrganizerRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCode3,
      operatorId: organizerUser2._id.toString(),
      signature: sig3,
      scanMode: "qr",
    });
    assert(crossOrganizerRes.success === false, "Foreign organizer cannot check in attendees for other organizers' events");
    assert(crossOrganizerRes.status === 403, "Returns HTTP 403 Forbidden for foreign organizer");

    // 6.3 Superadmin has universal oversight and can check in any event
    const adminCheckInRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCode3,
      operatorId: adminUser._id.toString(),
      signature: sig3,
      scanMode: "qr",
    });
    assert(adminCheckInRes.success === true, "Superadmin has universal oversight to check in attendees");
    assert(adminCheckInRes.status === 200, "Superadmin check-in succeeds with HTTP 200");

    // -------------------------------------------------------------------------
    // SUITE 7: Atomic Race Condition & Concurrent Scan Lock
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("⚡ SUITE 7: Atomic Race Condition & Concurrent Scan Lock");
    console.log("--------------------------------------------------------------------------------");

    // Create fresh un-checked ticket for concurrency race
    const ticketCodeRace = TicketSecurityService.generateTicketCode();
    const sigRace = TicketSecurityService.signTicket(ticketCodeRace, event1._id.toString());
    const raceTicket = await Ticket.create({
      bookingId: booking1._id,
      eventId: event1._id,
      userId: regularStudent._id,
      ticketTierId: eventTierId1,
      tierName: "Standard VIP",
      ticketCode: ticketCodeRace,
      attendeeName: "Concurrent Candidate",
      attendeeEmail: "candidate@notari.oau.edu.ng",
      pricePaid: 2500,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(raceTicket._id);

    // Launch 5 simultaneous check-in requests
    const concurrencyPromises = Array.from({ length: 5 }, () =>
      verifyAndCheckInTicket({
        eventId: event1._id.toString(),
        ticketCode: ticketCodeRace,
        operatorId: organizerUser._id.toString(),
        signature: sigRace,
        scanMode: "qr",
      })
    );

    const concurrencyResults = await Promise.all(concurrencyPromises);
    const successfulConcurrencies = concurrencyResults.filter((r) => r.success && r.status === 200);
    const rejectedConcurrencies = concurrencyResults.filter((r) => !r.success && r.status === 409);

    assert(successfulConcurrencies.length === 1, `Exactly 1 concurrent request succeeded (got ${successfulConcurrencies.length})`);
    assert(rejectedConcurrencies.length === 4, `Exactly 4 concurrent requests rejected with HTTP 409 (got ${rejectedConcurrencies.length})`);

    // Verify ticket admitted exactly once
    const dbRaceTicket = await Ticket.findById(raceTicket._id);
    assert(dbRaceTicket?.isCheckedIn === true, "Ticket is marked checked-in exactly once in MongoDB");

    // -------------------------------------------------------------------------
    // SUITE 8: Manual Attendee Lookup & Direct Check-in
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("✍️ SUITE 8: Manual Attendee Lookup & Direct Check-in");
    console.log("--------------------------------------------------------------------------------");

    // Create ticket for manual check-in without signature parameter
    const ticketCodeManual = TicketSecurityService.generateTicketCode();
    const manualTicket = await Ticket.create({
      bookingId: booking1._id,
      eventId: event1._id,
      userId: regularStudent._id,
      ticketTierId: eventTierId1,
      tierName: "Standard VIP",
      ticketCode: ticketCodeManual,
      attendeeName: "Folashade Alade",
      attendeeEmail: "folashade@notari.oau.edu.ng",
      pricePaid: 2500,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(manualTicket._id);

    // Manual check-in (signature omitted)
    const manualRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCodeManual,
      operatorId: organizerUser._id.toString(),
      scanMode: "manual",
    });

    assert(manualRes.success === true, "Authorized organizer can manually check in attendee by ticket code");
    assert(manualRes.status === 200, "Manual check-in succeeds with HTTP 200");
    assert(manualRes.ticket?.attendeeName === "Folashade Alade", "Returns attendee name on manual admission");

    // Resubmission manually fails as duplicate
    const manualDupRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCodeManual,
      operatorId: organizerUser._id.toString(),
      scanMode: "manual",
    });
    assert(manualDupRes.success === false && manualDupRes.status === 409, "Manual duplicate check-in is rejected with HTTP 409");

    // -------------------------------------------------------------------------
    // SUITE 9: Gate Check-in Metrics & Real-time Door Statistics
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📊 SUITE 9: Gate Check-in Metrics & Real-time Door Statistics");
    console.log("--------------------------------------------------------------------------------");

    const stats = await getEventCheckInStats(event1._id.toString(), organizerUser._id.toString());

    assert(typeof stats.totalTickets === "number" && stats.totalTickets >= 4, "Total tickets count is accurate");
    assert(typeof stats.checkedInCount === "number" && stats.checkedInCount >= 3, "Checked-in count matches admitted tickets");
    assert(stats.remainingCount === stats.totalTickets - stats.checkedInCount, "Remaining count = Total - CheckedIn");
    assert(stats.checkInPercentage > 0 && stats.checkInPercentage <= 100, `Check-in percentage is valid (${stats.checkInPercentage}%)`);
    assert(Array.isArray(stats.recentCheckIns) && stats.recentCheckIns.length >= 3, "Recent check-ins list contains admitted attendees");
    assert(stats.recentCheckIns[0].attendeeName.length > 0, "Recent check-in entry contains attendee name");

    // -------------------------------------------------------------------------
    // SUITE 10: Attendee Roster Search & Offline Conflict Resolution
    // -------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("👥 SUITE 10: Attendee Roster Search & Offline Conflict Resolution");
    console.log("--------------------------------------------------------------------------------");

    // Test search by attendee name
    const searchByName = await getEventAttendees(
      event1._id.toString(),
      organizerUser._id.toString(),
      { search: "Folashade", status: "all", page: 1, limit: 10 }
    );
    assert(searchByName.items.length === 1, "Roster search by name finds exact attendee");
    assert(searchByName.items[0].ticketCode === ticketCodeManual, "Matching attendee has correct ticket code");

    // Test search by ticket code
    const searchByCode = await getEventAttendees(
      event1._id.toString(),
      organizerUser._id.toString(),
      { search: ticketCode1.substring(0, 10), status: "all", page: 1, limit: 10 }
    );
    assert(searchByCode.items.length >= 1, "Roster search by partial ticket code succeeds");

    // Test offline sync when ticket was already checked in (conflict resolution)
    const offlineSyncRes = await verifyAndCheckInTicket({
      eventId: event1._id.toString(),
      ticketCode: ticketCode1,
      operatorId: organizerUser._id.toString(),
      scanMode: "offline_sync",
      offlineTimestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    });
    assert(offlineSyncRes.success === false, "Offline sync on already-checked-in ticket detects conflict");
    assert(offlineSyncRes.status === 409, "Offline conflict returns HTTP 409");
    assert(offlineSyncRes.code === "ALREADY_CHECKED_IN", "Conflict code is ALREADY_CHECKED_IN");
  } finally {
    // Teardown
    console.log("\n🧹 Cleaning up test fixtures from MongoDB...");
    await Ticket.deleteMany({ _id: { $in: createdTicketIds } });
    await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    await Event.deleteMany({ _id: { $in: createdEventIds } });
    await OrganizerProfile.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log(" Cleaned up test database records.");
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }

  console.log("\n================================================================================");
  console.log(`📊 FINAL TEST REPORT (PHASE 5.5 GATE CHECK-IN AUDIT): ${passCount} PASSED, ${failCount} FAILED`);
  console.log("================================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runCheckInE2E().catch((err) => {
  console.error("❌ Fatal error in Phase 5.5 E2E check-in audit:", err);
  process.exit(1);
});

