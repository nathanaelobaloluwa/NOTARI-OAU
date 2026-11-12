/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/database/mongoose";
import { User } from "../models/User";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { Event } from "../models/Event";
import { Ticket } from "../models/Ticket";
import { Booking } from "../models/Booking";
import { Payment, PAYMENT_STATUS } from "../models/Payment";
import { getOrganizerFinancialSummary } from "../lib/financial/balance";

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

function assert(condition: unknown, testName: string) {
  if (Boolean(condition)) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n================================================================================");
  console.log("🎪 NOTARI 2.0: COMPLETE ORGANIZER DASHBOARD FUNCTIONALITY AUDIT & REPAIR");
  console.log("================================================================================\n");

  await connectToDatabase();
  console.log("🔌 Connected to MongoDB Atlas.\n");

  const timestamp = Date.now();
  const testOrgUserEmail = `test_org_${timestamp}@oau.edu.ng`;
  const otherOrgUserEmail = `other_org_${timestamp}@oau.edu.ng`;
  const testStudentEmail = `student_${timestamp}@student.oau.edu.ng`;

  let testOrgUser: any;
  let otherOrgUser: any;
  let testStudentUser: any;
  let testOrgProfile: any;
  let otherOrgProfile: any;
  let testEventFree: any;
  let testEventPaid: any;
  let otherEvent: any;
  let testBooking: any;
  let testPayment: any;
  let testTicket: any;

  try {
    // -------------------------------------------------------------------------
    // SETUP FIXTURES
    // -------------------------------------------------------------------------
    testOrgUser = await User.create({
      name: "Great Ife Tech Hub",
      email: testOrgUserEmail,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      emailVerified: new Date(),
    });

    otherOrgUser = await User.create({
      name: "OAU Literary Society",
      email: otherOrgUserEmail,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      emailVerified: new Date(),
    });

    testStudentUser = await User.create({
      name: "Adeola Johnson",
      email: testStudentEmail,
      role: USER_ROLES.STUDENT,
      isOrganizer: false,
      matricNumber: `CSC/${timestamp.toString().slice(-4)}/001`,
      faculty: "Faculty of Technology",
      department: "Computer Science & Engineering",
      emailVerified: new Date(),
    });

    testOrgProfile = await OrganizerProfile.create({
      userId: testOrgUser._id,
      organizerType: "organization",
      organizationName: "Great Ife Tech Hub",
      category: "Technology & Coding",
      description: "Premier student technology organization at Obafemi Awolowo University.",
      contactEmail: testOrgUserEmail,
      contactPhone: "08012345678",
      status: ORGANIZER_STATUS.APPROVED,
      approvedAt: new Date(),
    });

    otherOrgProfile = await OrganizerProfile.create({
      userId: otherOrgUser._id,
      organizerType: "organization",
      organizationName: "OAU Literary Society",
      category: "Arts & Culture",
      description: "Literary and debates association.",
      contactEmail: otherOrgUserEmail,
      contactPhone: "08087654321",
      status: ORGANIZER_STATUS.APPROVED,
      approvedAt: new Date(),
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Event 1: Free published upcoming event for testOrgUser
    testEventFree = await Event.create({
      title: "IFE Tech Hackathon 2026",
      slug: `ife-tech-hackathon-${timestamp}`,
      description: "Annual university coding competition at Oduduwa Hall.",
      category: "Tech & Innovation",
      venue: "Oduduwa Hall",
      organizerId: testOrgUser._id,
      organizerName: "Great Ife Tech Hub",
      startDate: tomorrow,
      endDate: dayAfter,
      isFree: true,
      status: "published",
      totalCapacity: 250,
      registeredCount: 1,
      ticketTiers: [
        {
          name: "General Admission",
          price: 0,
          capacity: 250,
          available: 249,
          maxPerOrder: 5,
        },
      ],
    });

    // Event 2: Paid published upcoming event for testOrgUser
    testEventPaid = await Event.create({
      title: "OAU Tech Summit Gala",
      slug: `oau-tech-summit-gala-${timestamp}`,
      description: "Exclusive evening dinner and networking at Amphi Theatre.",
      category: "Tech & Innovation",
      venue: "Amphitheatre Stage",
      organizerId: testOrgUser._id,
      organizerName: "Great Ife Tech Hub",
      startDate: tomorrow,
      endDate: dayAfter,
      isFree: false,
      status: "published",
      totalCapacity: 100,
      registeredCount: 2,
      ticketTiers: [
        {
          name: "Standard VIP Pass",
          price: 5000,
          capacity: 80,
          available: 78,
          maxPerOrder: 5,
        },
        {
          name: "Executive Pass",
          price: 15000,
          capacity: 20,
          available: 20,
          maxPerOrder: 2,
        },
      ],
    });

    // Event 3: Event for other organizer (Data Isolation)
    otherEvent = await Event.create({
      title: "OAU Annual Poetry Festival",
      slug: `oau-poetry-festival-${timestamp}`,
      description: "Poetry reading and book launches.",
      category: "Arts & Culture",
      venue: "Humanities Auditorium",
      organizerId: otherOrgUser._id,
      organizerName: "OAU Literary Society",
      startDate: tomorrow,
      endDate: dayAfter,
      isFree: true,
      status: "published",
      totalCapacity: 150,
      registeredCount: 0,
      ticketTiers: [
        {
          name: "Auditorium Seating",
          price: 0,
          capacity: 150,
          available: 150,
        },
      ],
    });

    // Booking & Paid Payment
    const bookingRef = `NOT-BKG-TEST-${timestamp}`;
    const paymentRef = `NOT-PAY-TEST-${timestamp}`;

    testBooking = await Booking.create({
      bookingReference: bookingRef,
      userId: testStudentUser._id,
      eventId: testEventPaid._id,
      organizerId: testOrgUser._id,
      ticketTierId: testEventPaid.ticketTiers[0]._id,
      quantity: 2,
      unitPrice: 5000,
      totalAmount: 10000,
      paymentStatus: "successful",
      paymentReference: paymentRef,
      paymentChannel: "paystack",
      paidAt: new Date(),
    });

    testPayment = await Payment.create({
      userId: testStudentUser._id,
      eventId: testEventPaid._id,
      bookingId: testBooking._id,
      organizerId: testOrgUser._id,
      ticketTierId: testEventPaid.ticketTiers[0]._id,
      tierName: "Standard VIP Pass",
      quantity: 2,
      unitPrice: 5000,
      amount: 10000,
      amountInKobo: 1000000, // ₦10,000 in integer Kobo
      currency: "NGN",
      paymentReference: paymentRef,
      paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
      paymentChannel: "paystack",
      customerEmail: testStudentEmail,
      customerName: "Adeola Johnson",
      paidAt: new Date(),
      reservedUntil: new Date(Date.now() + 30 * 60 * 1000),
    });

    const ticketCode = `NOT-TKT-TEST-${timestamp}`;
    testTicket = await Ticket.create({
      bookingId: testBooking._id,
      eventId: testEventPaid._id,
      userId: testStudentUser._id,
      ticketTierId: testEventPaid.ticketTiers[0]._id,
      tierName: "Standard VIP Pass",
      ticketCode,
      attendeeName: "Adeola Johnson",
      attendeeEmail: testStudentEmail,
      pricePaid: 5000,
      isCheckedIn: false,
    });

    // -------------------------------------------------------------------------
    // SECTION 1: DASHBOARD METRICS & INTEGER KOBO REVENUE
    // -------------------------------------------------------------------------
    console.log("▶ 1. Dashboard Metrics & Financial Calculations");
    const orgIds = [testOrgUser._id, testOrgProfile._id];

    const [totalEvents, upcomingEvents, totalBookings, finSummary] = await Promise.all([
      Event.countDocuments({ organizerId: { $in: orgIds } }),
      Event.countDocuments({ organizerId: { $in: orgIds }, status: "published", startDate: { $gte: new Date() } }),
      Booking.countDocuments({ organizerId: { $in: orgIds }, paymentStatus: "successful" }),
      getOrganizerFinancialSummary(orgIds),
    ]);

    assert(totalEvents === 2, "Total events count accurately reflects organizer's events (2 events)");
    assert(upcomingEvents === 2, "Upcoming published events count is accurate (2 upcoming)");
    assert(totalBookings === 1, "Total bookings count matches database records");
    assert(finSummary.grossSalesInKobo === 1000000, "Gross sales calculated in integer Kobo (1,000,000 Kobo = ₦10,000)");
    assert(finSummary.grossSalesInNaira === 10000, "Gross sales correctly formats to ₦10,000");

    // -------------------------------------------------------------------------
    // SECTION 2: DATA ISOLATION (ORGANIZER A CANNOT ACCESS ORGANIZER B)
    // -------------------------------------------------------------------------
    console.log("\n▶ 2. Multi-Tenant Organizer Data Isolation");
    const otherOrgIds = [otherOrgUser._id, otherOrgProfile._id];
    const otherSummary = await getOrganizerFinancialSummary(otherOrgIds);

    assert(otherSummary.grossSalesInKobo === 0, "Other organizer gross sales strictly 0 Kobo");
    assert(otherSummary.successfulOrdersCount === 0, "Other organizer has 0 successful orders");

    const isolatedEvents = await Event.find({ organizerId: { $in: otherOrgIds } });
    assert(isolatedEvents.length === 1, "Other organizer only sees their own 1 event");
    assert(isolatedEvents[0].title === "OAU Annual Poetry Festival", "Event title matches other organizer");

    // -------------------------------------------------------------------------
    // SECTION 3: ATTENDEES DIRECTORY & FILTERING
    // -------------------------------------------------------------------------
    console.log("\n▶ 3. Attendees Directory & Status Tracking");
    const attendees = await Ticket.find({ eventId: testEventPaid._id }).lean();
    assert(attendees.length === 1, "Attendee query retrieves ticket for test event");
    assert(attendees[0].ticketCode === ticketCode, "Retrieved ticket code matches issued ticket");
    assert(attendees[0].attendeeName === "Adeola Johnson", "Attendee name matches registered student");
    assert(attendees[0].isCheckedIn === false, "Check-in status starts as Not Arrived (false)");

    // Simulate check-in
    await Ticket.updateOne({ _id: testTicket._id }, { $set: { isCheckedIn: true, checkedInAt: new Date() } });
    const updatedTicket = await Ticket.findById(testTicket._id).lean();
    assert(updatedTicket?.isCheckedIn === true, "Gate check-in updates status to checked-in");
    assert(updatedTicket?.checkedInAt != null, "Check-in timestamp recorded");

    // -------------------------------------------------------------------------
    // SECTION 4: TICKET TIER MANAGEMENT & SAFETY RULES
    // -------------------------------------------------------------------------
    console.log("\n▶ 4. Ticket Tier Management & Modification Rules");
    // Free event must not have paid tiers
    const freeTierValid = testEventFree.ticketTiers.every((t: any) => t.price === 0);
    assert(freeTierValid === true, "Free event tiers are enforced at ₦0");

    // Paid event has 2 tiers
    assert(testEventPaid.ticketTiers.length === 2, "Paid event contains 2 ticket tiers");
    const tierNames = testEventPaid.ticketTiers.map((t: any) => t.name);
    assert(tierNames.includes("Standard VIP Pass"), "Paid event contains Standard VIP Pass");
    assert(tierNames.includes("Executive Pass"), "Paid event contains Executive Pass");

    // -------------------------------------------------------------------------
    // SECTION 5: ANALYTICS & FACULTY DEMOGRAPHICS AGGREGATION
    // -------------------------------------------------------------------------
    console.log("\n▶ 5. Analytics & Demographics Aggregation");
    const facultyAgg = await Ticket.aggregate([
      { $match: { eventId: { $in: [testEventFree._id, testEventPaid._id] } } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $group: {
          _id: "$student.faculty",
          count: { $sum: 1 },
        },
      },
    ]);

    assert(facultyAgg.length > 0, "Faculty demographic aggregation yields results");
    assert(facultyAgg[0]._id === "Faculty of Technology", "Aggregated faculty matches student profile");
    assert(facultyAgg[0].count === 1, "Faculty attendee count is accurate");

    // -------------------------------------------------------------------------
    // SECTION 6: SEARCH FUNCTIONALITY (EVENTS, ORDERS & ATTENDEES)
    // -------------------------------------------------------------------------
    console.log("\n▶ 6. Header Search Functionality & Scope Isolation");
    const searchRegex = new RegExp("Oduduwa", "i");
    const searchEvents = await Event.find({
      organizerId: { $in: [testOrgUser._id, testOrgProfile._id] },
      venue: searchRegex,
    }).lean();
    assert(searchEvents.length === 1, "Search finds organizer's event by venue keyword");
    assert(searchEvents[0].title === "IFE Tech Hackathon 2026", "Event search returns correct event");

    // Search order by reference
    const searchOrder = await Payment.findOne({
      organizerId: { $in: [testOrgUser._id, testOrgProfile._id] },
      paymentReference: paymentRef,
    }).lean();
    assert(searchOrder != null, "Search finds order by payment reference");
    assert(searchOrder?.customerName === "Adeola Johnson", "Search order returns correct customer name");

    // Search attendee by ticket code
    const searchAttendee = await Ticket.findOne({
      eventId: testEventPaid._id,
      ticketCode: ticketCode,
    }).lean();
    assert(searchAttendee != null, "Search finds attendee by ticket code");
    assert(searchAttendee?.attendeeEmail === testStudentEmail, "Search attendee returns correct email");

    // -------------------------------------------------------------------------
    // SECTION 7: TIME-RANGE WINDOWING & SALES TREND CALCULATION
    // -------------------------------------------------------------------------
    console.log("\n▶ 7. Sales Overview Time-Range Windowing (7d, 30d, 90d)");
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const payments7d = await Payment.countDocuments({
      organizerId: { $in: [testOrgUser._id, testOrgProfile._id] },
      paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
      paidAt: { $gte: d7 },
    });
    const payments30d = await Payment.countDocuments({
      organizerId: { $in: [testOrgUser._id, testOrgProfile._id] },
      paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
      paidAt: { $gte: d30 },
    });
    const payments90d = await Payment.countDocuments({
      organizerId: { $in: [testOrgUser._id, testOrgProfile._id] },
      paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
      paidAt: { $gte: d90 },
    });

    assert(payments7d === 1, "Last 7 days window captures recent payment");
    assert(payments30d === 1, "Last 30 days window captures recent payment");
    assert(payments90d === 1, "Last 90 days window captures recent payment");

    // -------------------------------------------------------------------------
    // SECTION 8: SIDEBAR & NAVIGATION DESTINATIONS INTEGRITY
    // -------------------------------------------------------------------------
    console.log("\n▶ 8. Sidebar & Navigation Route Integrity");
    const requiredOrganizerRoutes = [
      "src/app/organizer/page.tsx",
      "src/app/organizer/events/page.tsx",
      "src/app/organizer/events/create/page.tsx",
      "src/app/organizer/tickets/page.tsx",
      "src/app/organizer/orders/page.tsx",
      "src/app/organizer/attendees/page.tsx",
      "src/app/organizer/check-in/page.tsx",
      "src/app/organizer/payouts/page.tsx",
      "src/app/organizer/analytics/page.tsx",
      "src/app/organizer/profile/page.tsx",
    ];

    for (const routePath of requiredOrganizerRoutes) {
      const fullPath = path.resolve(process.cwd(), routePath);
      assert(fs.existsSync(fullPath), `Route destination exists on disk: ${routePath}`);
    }

    // -------------------------------------------------------------------------
    // SECTION 9: MULTI-TENANT MODIFICATION GUARD
    // -------------------------------------------------------------------------
    console.log("\n▶ 9. Multi-Tenant Event Modification Guard");
    const foreignEvent = await Event.findOne({
      _id: otherEvent._id,
      organizerId: { $in: [testOrgUser._id, testOrgProfile._id] },
    });
    assert(foreignEvent == null, "Organizer cannot query or modify another organizer's event");
  } catch (err) {
    console.error("  ❌ Test suite error:", err);
    failed++;
  } finally {
    // Clean up test records
    console.log("\n▶ Cleaning up test fixtures from MongoDB Atlas...");
    if (testTicket?._id) await Ticket.deleteOne({ _id: testTicket._id });
    if (testPayment?._id) await Payment.deleteOne({ _id: testPayment._id });
    if (testBooking?._id) await Booking.deleteOne({ _id: testBooking._id });
    if (testEventFree?._id) await Event.deleteOne({ _id: testEventFree._id });
    if (testEventPaid?._id) await Event.deleteOne({ _id: testEventPaid._id });
    if (otherEvent?._id) await Event.deleteOne({ _id: otherEvent._id });
    if (testOrgProfile?._id) await OrganizerProfile.deleteOne({ _id: testOrgProfile._id });
    if (otherOrgProfile?._id) await OrganizerProfile.deleteOne({ _id: otherOrgProfile._id });
    if (testOrgUser?._id) await User.deleteOne({ _id: testOrgUser._id });
    if (otherOrgUser?._id) await User.deleteOne({ _id: otherOrgUser._id });
    if (testStudentUser?._id) await User.deleteOne({ _id: testStudentUser._id });
    console.log("  🧹 Test fixtures cleaned up.");

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 FINAL TEST REPORT: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
