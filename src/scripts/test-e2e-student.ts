import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import { USER_ROLES } from "../constants/roles";
import { EVENT_STATUS, EVENT_CATEGORIES } from "../constants/oau";
import {
  getStudentProfile,
  updateStudentProfile,
  changeStudentPassword,
  getStudentHistory,
} from "../lib/student/service";

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

async function runStudentE2E() {
  console.log("\n================================================================================");
  console.log("🎓 NOTARI 2.0: END-TO-END LIVE STUDENT HISTORY & SETTINGS PERSISTENCE AUDIT");
  console.log("================================================================================\n");

  console.log(`🔌 Target MongoDB: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@")}`);

  let isConnected = false;
  const runId = Date.now();

  try {
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
    } else {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      isConnected = true;
    }
    console.log("✅ Live MongoDB Atlas connection established.\n");

    // Pre-cleanup of any lingering test records
    await User.deleteMany({ email: { $regex: /^test_std_/ } });
    await Event.deleteMany({ slug: { $regex: /^test-std-event-/ } });

    console.log("--- 1. Seed Isolated Test Data (Students, Organizer, Admin, Events & Passes) ---");

    const initialPassword = "InitialSecurePassword2026!";
    const initialPasswordHash = await bcrypt.hash(initialPassword, 12);

    // Student A
    const studentA = await User.create({
      name: `Student Alpha ${runId}`,
      email: `test_std_a_${runId}@oau.edu.ng`,
      password: initialPasswordHash,
      role: USER_ROLES.STUDENT,
      matricNumber: `CSC/${runId % 10000}/001`,
      faculty: "Technology",
      department: "Computer Science and Engineering",
      phone: "08012345678",
      isVerified: false,
    });

    // Student B (for isolation verification)
    const studentB = await User.create({
      name: `Student Beta ${runId}`,
      email: `test_std_b_${runId}@oau.edu.ng`,
      password: initialPasswordHash,
      role: USER_ROLES.STUDENT,
      matricNumber: `CSC/${runId % 10000}/002`,
      faculty: "Technology",
      department: "Computer Science and Engineering",
    });

    // Organizer
    const organizer = await User.create({
      name: `Tech Society OAU ${runId}`,
      email: `test_std_org_${runId}@oau.edu.ng`,
      password: initialPasswordHash,
      role: USER_ROLES.ORGANIZER,
    });

    // Admin
    const admin = await User.create({
      name: `DSA Admin Officer ${runId}`,
      email: `test_std_adm_${runId}@oau.edu.ng`,
      password: initialPasswordHash,
      role: USER_ROLES.ADMIN,
    });

    // Future Event (Upcoming)
    const futureEvent = await Event.create({
      title: `Upcoming Ife Tech Summit ${runId}`,
      slug: `test-std-event-future-${runId}`,
      description: "An upcoming technology and innovation summit at Oduduwa Hall.",
      organizerId: organizer._id,
      organizerName: "Tech Society OAU",
      venue: "Oduduwa Hall, OAU Campus",
      startDate: new Date(Date.now() + 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 6),
      category: EVENT_CATEGORIES[1],
      status: EVENT_STATUS.PUBLISHED,
      isFree: true,
      ticketTiers: [
        {
          name: "Standard Free Pass",
          price: 0,
          capacity: 100,
          available: 99,
          maxPerOrder: 1,
        },
      ],
    });

    // Past Event (Attended)
    const pastEvent = await Event.create({
      title: `Past Freshers Orientation ${runId}`,
      slug: `test-std-event-past-${runId}`,
      description: "A past orientation event that was attended and checked in.",
      organizerId: organizer._id,
      organizerName: "Tech Society OAU",
      venue: "Amphitheatre, OAU Campus",
      startDate: new Date(Date.now() - 86400000 * 10),
      endDate: new Date(Date.now() - 86400000 * 9),
      category: EVENT_CATEGORIES[0],
      status: EVENT_STATUS.PUBLISHED,
      isFree: true,
      ticketTiers: [
        {
          name: "Orientation Pass",
          price: 0,
          capacity: 500,
          available: 499,
          maxPerOrder: 1,
        },
      ],
    });

    // Booking 1 for Student A on Future Event
    const booking1 = await Booking.create({
      bookingReference: `NOT-2026-FUT${runId % 100000}`,
      userId: studentA._id,
      eventId: futureEvent._id,
      ticketTierId: futureEvent.ticketTiers[0]._id,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
      paymentChannel: "free",
      paidAt: new Date(),
    });

    // Ticket 1 for Student A on Future Event (Unchecked)
    const ticket1 = await Ticket.create({
      bookingId: booking1._id,
      eventId: futureEvent._id,
      userId: studentA._id,
      ticketTierId: futureEvent.ticketTiers[0]._id,
      tierName: "Standard Free Pass",
      ticketCode: `NOT-OAU-FUT${runId % 1000000}`,
      attendeeName: studentA.name,
      attendeeEmail: studentA.email,
      pricePaid: 0,
      isCheckedIn: false,
    });

    // Booking 2 for Student A on Past Event
    const booking2 = await Booking.create({
      bookingReference: `NOT-2026-PST${runId % 100000}`,
      userId: studentA._id,
      eventId: pastEvent._id,
      ticketTierId: pastEvent.ticketTiers[0]._id,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
      paymentChannel: "free",
      paidAt: new Date(Date.now() - 86400000 * 12),
    });

    // Ticket 2 for Student A on Past Event (Verified & Checked In)
    const ticket2 = await Ticket.create({
      bookingId: booking2._id,
      eventId: pastEvent._id,
      userId: studentA._id,
      ticketTierId: pastEvent.ticketTiers[0]._id,
      tierName: "Orientation Pass",
      ticketCode: `NOT-OAU-PST${runId % 1000000}`,
      attendeeName: studentA.name,
      attendeeEmail: studentA.email,
      pricePaid: 0,
      isCheckedIn: true,
      checkedInAt: new Date(Date.now() - 86400000 * 10 + 3600000),
    });

    assert(Boolean(studentA._id && studentB._id), "Isolated student accounts initialized");
    assert(Boolean(booking1._id && ticket1._id), "Future event booking and ticket created");
    assert(Boolean(booking2._id && ticket2._id), "Past event booking and verified ticket created");

    // TEST SUITE 2: Student Profile Retrieval
    console.log("\n--- 2. Student Profile Retrieval & Safe Projection ---");
    const profileRes = await getStudentProfile(studentA._id.toString());
    assert(profileRes.success && profileRes.status === 200, "getStudentProfile succeeds with 200 OK");
    const profileData = profileRes.data as {
      id: string;
      name: string;
      email: string;
      matricNumber: string;
      role: string;
      phone: string;
      password?: string;
    };
    assert(profileData.name === studentA.name, "Profile returns matching student name");
    assert(profileData.email === studentA.email, "Profile returns matching student email");
    assert(profileData.matricNumber === studentA.matricNumber, "Profile returns matching matric number");
    assert(profileData.role === USER_ROLES.STUDENT, "Profile role confirms 'student'");
    assert(profileData.password === undefined, "Security: Password field is never exposed in profile payload");

    // TEST SUITE 3: Student Profile Updates & Protected Fields
    console.log("\n--- 3. Student Profile Update & Protected Field Immunity ---");
    const updateRes = await updateStudentProfile(studentA._id.toString(), {
      name: `Updated Student Alpha ${runId}`,
      phone: "08099887766",
      faculty: "Technology",
      department: "Software Engineering",
    });

    assert(updateRes.success && updateRes.status === 200, "updateStudentProfile succeeds with 200 OK");
    const updatedInDb = await User.findById(studentA._id).lean();
    assert(updatedInDb?.name === `Updated Student Alpha ${runId}`, "Database confirms student name updated");
    assert(updatedInDb?.phone === "08099887766", "Database confirms student phone updated");
    assert(updatedInDb?.department === "Software Engineering", "Database confirms department updated");
    assert(updatedInDb?.role === USER_ROLES.STUDENT, "Security: Student role remained strictly 'student'");
    assert(updatedInDb?.matricNumber === studentA.matricNumber, "Security: Matric number remained immutable");
    assert(updatedInDb?.email === studentA.email, "Security: Email remained immutable");
    assert(updatedInDb?.isVerified === false, "Security: isVerified flag remained false");

    // TEST SUITE 4: Password Verification & Secure Update Flow
    console.log("\n--- 4. Password Management & Cryptographic Hashing ---");
    // 4.1 Invalid current password rejection
    const wrongCurrentPassRes = await changeStudentPassword(studentA._id.toString(), {
      currentPassword: "IncorrectPassword123!",
      newPassword: "NewSecurePassword2026!",
      confirmPassword: "NewSecurePassword2026!",
    });
    assert(
      !wrongCurrentPassRes.success && wrongCurrentPassRes.status === 400,
      "Incorrect current password is rejected with 400 Bad Request"
    );

    // 4.2 Valid current password update
    const validPassChangeRes = await changeStudentPassword(studentA._id.toString(), {
      currentPassword: initialPassword,
      newPassword: "NewSecurePassword2026!",
      confirmPassword: "NewSecurePassword2026!",
    });
    assert(
      validPassChangeRes.success && validPassChangeRes.status === 200,
      "Valid password change succeeds with 200 OK"
    );

    const userWithPass = await User.findById(studentA._id).select("+password").lean();
    assert(
      Boolean(userWithPass?.password && userWithPass.password.startsWith("$2")),
      "New password is encrypted with bcrypt format in MongoDB"
    );
    assert(
      !(await bcrypt.compare(initialPassword, userWithPass!.password!)),
      "Old password no longer authenticates"
    );
    assert(
      await bcrypt.compare("NewSecurePassword2026!", userWithPass!.password!),
      "New password authenticates successfully against stored hash"
    );

    // TEST SUITE 5: Booking & Attendance History Classification
    console.log("\n--- 5. Booking & Attendance History Classification ---");
    const historyRes = await getStudentHistory(studentA._id.toString(), "all");
    assert(historyRes.success && historyRes.status === 200, "getStudentHistory succeeds with 200 OK");
    const historyData = historyRes.data as {
      items: Array<{
        id: string;
        bookingReference: string;
        isUpcoming: boolean;
        isPast: boolean;
        isAttended: boolean;
        attendanceStatus: string;
        event: { id: string; title: string };
      }>;
      counts: { all: number; upcoming: number; attended: number; past: number };
    };

    assert(historyData.items.length === 2, "History returns both bookings for Student A");
    assert(historyData.counts.all === 2, "Counts: all is 2");
    assert(historyData.counts.upcoming === 1, "Counts: upcoming is 1");
    assert(historyData.counts.attended === 1, "Counts: attended is 1");
    assert(historyData.counts.past === 1, "Counts: past is 1");

    const futureItem = historyData.items.find((i) => i.event?.id === futureEvent._id.toString());
    assert(
      Boolean(futureItem && futureItem.isUpcoming && futureItem.attendanceStatus === "upcoming"),
      "Future event classified as isUpcoming: true, attendanceStatus: 'upcoming'"
    );

    const pastItem = historyData.items.find((i) => i.event?.id === pastEvent._id.toString());
    assert(
      Boolean(pastItem && pastItem.isPast && pastItem.isAttended && pastItem.attendanceStatus === "attended"),
      "Past event with checked-in pass classified as isPast: true, isAttended: true, attendanceStatus: 'attended'"
    );

    // Tab filtering: upcoming only
    const upcomingTabRes = await getStudentHistory(studentA._id.toString(), "upcoming");
    const upcomingItems = (upcomingTabRes.data as { items: unknown[] }).items;
    assert(upcomingItems.length === 1, "Tab 'upcoming' filters strictly to 1 item");

    // Tab filtering: attended only
    const attendedTabRes = await getStudentHistory(studentA._id.toString(), "attended");
    const attendedItems = (attendedTabRes.data as { items: unknown[] }).items;
    assert(attendedItems.length === 1, "Tab 'attended' filters strictly to 1 verified event");

    // TEST SUITE 6: Cross-Student History Isolation
    console.log("\n--- 6. Cross-Student History Isolation ---");
    const studentBHistory = await getStudentHistory(studentB._id.toString(), "all");
    const studentBItems = (studentBHistory.data as { items: unknown[]; counts: { all: number } });
    assert(
      studentBItems.counts.all === 0 && studentBItems.items.length === 0,
      "Student B cannot see Student A's bookings or tickets (history is isolated and empty)"
    );

    // TEST SUITE 7: Role Authorization Enforcement
    console.log("\n--- 7. Role Authorization Guards ---");
    const orgProfileRes = await getStudentProfile(organizer._id.toString());
    assert(
      !orgProfileRes.success && orgProfileRes.status === 403,
      "Organizer attempting to access student profile is rejected (403)"
    );

    const adminProfileRes = await getStudentProfile(admin._id.toString());
    assert(
      !adminProfileRes.success && adminProfileRes.status === 403,
      "Admin attempting to access student profile is rejected (403)"
    );

    // TEST SUITE 8: Teardown & Cascade Cleanup
    console.log("\n--- 8. Cleanup & Teardown Verification ---");
    await Ticket.deleteMany({ _id: { $in: [ticket1._id, ticket2._id] } });
    await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id] } });
    await Event.deleteMany({ _id: { $in: [futureEvent._id, pastEvent._id] } });
    await User.deleteMany({ _id: { $in: [studentA._id, studentB._id, organizer._id, admin._id] } });

    const remainingTickets = await Ticket.countDocuments({
      _id: { $in: [ticket1._id, ticket2._id] },
    });
    assert(remainingTickets === 0, "Test tickets safely purged from MongoDB");

    console.log("\n================================================================================");
    console.log(`📊 STUDENT E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Fatal error during Student E2E testing:", error);
    process.exit(1);
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("🔌 Live MongoDB connection closed.");
    }
  }
}

runStudentE2E();
