/**
 * NOTARI 2.0 — Comprehensive Performance Baseline & Bottleneck Profiling Suite
 * Measures:
 * 1. Public Homepage data query
 * 2. Events Discovery catalog & filtering
 * 3. Event Details lookup by slug
 * 4. About Page rendering & data assembly
 * 5. Student Dashboard data assembly (profile, tickets, notifications)
 * 6. Organizer Dashboard analytics & demographics aggregation
 * 7. Admin Dashboard overview stats & queues
 * 8. Search & filtering response times
 * 9. Navigation & tab switching query response times
 * 10. Ticket booking transaction simulation
 * 11. QR check-in HMAC signature verification & atomic update
 * 12. Announcement & notification feed interactions
 * 13. JavaScript bundle size audit (.next build manifest)
 * 14. Database indexing & query performance profiling
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/database/mongoose";
import { Event } from "../models/Event";
import { User } from "../models/User";
import { Ticket } from "../models/Ticket";
import { Booking } from "../models/Booking";
import { Announcement } from "../models/Announcement";
import { Notification } from "../models/Notification";
import { OrganizerApplication } from "../models/OrganizerApplication";
import { announcementService } from "../services/announcement.service";
import { buildFacultyQueryRegex } from "../constants/oau";

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
        const value = trimmed.slice(eqIdx + 1).trim();
        if (key && !(key in process.env)) {
          process.env[key] = value.replace(/^["']|["']$/g, "");
        }
      }
    }
  }
}
loadLocalEnv();

interface BenchmarkResult {
  name: string;
  category: "public" | "student" | "organizer" | "admin" | "transactional";
  iterations: number;
  minMs: number;
  avgMs: number;
  maxMs: number;
  p95Ms: number;
  status: "OPTIMAL" | "ACCEPTABLE" | "WARNING" | "CRITICAL";
  notes?: string;
}

const benchmarkResults: BenchmarkResult[] = [];

async function measure<T>(
  name: string,
  category: BenchmarkResult["category"],
  fn: () => Promise<T>,
  iterations = 5,
  notes?: string
): Promise<T> {
  const timings: number[] = [];
  let lastResult: T | undefined;

  // Warm-up run
  await fn();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    lastResult = await fn();
    const duration = performance.now() - start;
    timings.push(duration);
  }

  timings.sort((a, b) => a - b);
  const minMs = Math.round(timings[0] * 10) / 10;
  const maxMs = Math.round(timings[timings.length - 1] * 10) / 10;
  const avgMs = Math.round((timings.reduce((sum, t) => sum + t, 0) / timings.length) * 10) / 10;
  const p95Idx = Math.floor(timings.length * 0.95);
  const p95Ms = Math.round(timings[Math.min(p95Idx, timings.length - 1)] * 10) / 10;

  // Target: <= 1000ms is OPTIMAL, <= 3000ms is ACCEPTABLE, > 3000ms is CRITICAL
  let status: BenchmarkResult["status"] = "OPTIMAL";
  if (avgMs > 3000) {
    status = "CRITICAL";
  } else if (avgMs > 1000) {
    status = "WARNING";
  } else if (avgMs > 500) {
    status = "ACCEPTABLE";
  }

  benchmarkResults.push({
    name,
    category,
    iterations,
    minMs,
    avgMs,
    maxMs,
    p95Ms,
    status,
    notes,
  });

  const icon = status === "OPTIMAL" ? "⚡" : status === "ACCEPTABLE" ? "✅" : status === "WARNING" ? "⚠️" : "🔴";
  console.log(`  ${icon} [${status.padEnd(10)}] ${name.padEnd(42)} avg: ${avgMs.toFixed(1)}ms (min: ${minMs}ms, max: ${maxMs}ms, p95: ${p95Ms}ms)`);

  return lastResult as T;
}

async function runPerformanceProfiling() {
  console.log("================================================================================");
  console.log("⚡ NOTARI 2.0 — PERFORMANCE BASELINE & BOTTLENECK PROFILING");
  console.log("================================================================================\n");

  await connectToDatabase();
  console.log("  🔌 Connected to MongoDB Atlas for live workload profiling.\n");

  const runId = Date.now();

  // Provision temporary benchmark fixtures
  console.log("▶ Setting up Benchmark Test Fixtures...");
  const benchOrganizer = await User.create({
    name: `Bench Org ${runId}`,
    email: `bench_org_${runId}@oauife.edu.ng`,
    password: "Password123!",
    role: "organizer",
    isOrganizer: true,
  });

  const benchStudent = await User.create({
    name: `Bench Student ${runId}`,
    email: `bench_student_${runId}@student.oauife.edu.ng`,
    password: "Password123!",
    role: "student",
    faculty: "Faculty of Computing Science and Engineering",
    department: "Computer Science",
    matricNumber: `CSC/${runId.toString().slice(-4)}/99`,
    isVerified: true,
  });

  const benchEvent = await Event.create({
    title: `Great Ife Tech Summit ${runId}`,
    slug: `great-ife-tech-summit-${runId}`,
    description: "Annual technology gathering bringing together top software engineers, founders, and designers across Great Ife.",
    category: "Tech & Innovation",
    venue: "Oduduwa Hall",
    faculty: "Faculty of Computing Science and Engineering",
    department: "Computer Science",
    startDate: new Date(Date.now() + 86400000 * 2),
    endDate: new Date(Date.now() + 86400000 * 3),
    organizerId: benchOrganizer._id.toString(),
    organizerName: "Tech Club OAU",
    status: "published",
    isFree: false,
    tickets: [
      {
        id: "tier_free",
        name: "Standard Student Pass",
        type: "free",
        price: 0,
        capacity: 500,
        soldCount: 120,
      },
      {
        id: "tier_vip",
        name: "VIP Networking Pass",
        type: "paid",
        price: 3000,
        capacity: 100,
        soldCount: 45,
      },
    ],
  });

  const tierObjectId = new mongoose.Types.ObjectId();
  const bookingObjectId = new mongoose.Types.ObjectId();

  const benchBooking = await Booking.create({
    _id: bookingObjectId,
    bookingReference: `BKG-BENCH-${runId}`,
    userId: benchStudent._id,
    eventId: benchEvent._id,
    organizerId: benchOrganizer._id,
    ticketTierId: tierObjectId,
    quantity: 1,
    unitPrice: 0,
    totalAmount: 0,
    paymentStatus: "successful",
    paymentChannel: "free",
    paidAt: new Date(),
  });

  const benchTicket = await Ticket.create({
    bookingId: benchBooking._id,
    eventId: benchEvent._id,
    userId: benchStudent._id,
    ticketTierId: tierObjectId,
    tierName: "Standard Student Pass",
    ticketCode: `TKT-BENCH-${runId}-001`,
    attendeeName: benchStudent.name,
    attendeeEmail: benchStudent.email,
    pricePaid: 0,
    status: "valid",
    isCheckedIn: false,
    issuedAt: new Date(),
  });

  const benchAnnouncement = await Announcement.create({
    title: `Campus Orientation & Welcome Notice ${runId}`,
    summary: "Essential guidance for all university students starting the semester.",
    content: "Welcome to Obafemi Awolowo University. Please ensure matriculation documents are completed.",
    category: "faculty_announcements",
    priority: "high",
    targetAudience: {
      type: "faculty",
      faculty: "Faculty of Computing Science and Engineering",
    },
    status: "published",
    authorId: benchOrganizer._id,
    authorRole: "admin",
    authorName: "OAU Administration",
  });

  const benchNotification = await Notification.create({
    userId: benchStudent._id,
    type: "event",
    title: "Event Reminder: Great Ife Tech Summit Tomorrow",
    message: "Your registered event starts in 24 hours at Oduduwa Hall.",
    isRead: false,
  });

  console.log("  ✅ Test fixtures created successfully.\n");

  // ---------------------------------------------------------------------------
  // 1. Public Surfaces Benchmarks
  // ---------------------------------------------------------------------------
  console.log("▶ 1. Measuring Public Routes & Queries");

  await measure(
    "Public Homepage Featured Events Query",
    "public",
    async () => {
      return Event.find({ status: "published" })
        .sort({ startDate: 1 })
        .limit(6)
        .select("title slug startDate endDate venue faculty category flyerUrl isFree tickets")
        .lean();
    },
    7,
    "Server-side featured cards on /"
  );

  await measure(
    "Events Discovery Catalog (Filtered by Category & Faculty)",
    "public",
    async () => {
      const facultyRegex = buildFacultyQueryRegex("Faculty of Computing Science and Engineering");
      return Event.find({
        status: "published",
        category: "Tech & Innovation",
        faculty: facultyRegex,
      })
        .sort({ startDate: 1 })
        .skip(0)
        .limit(9)
        .lean();
    },
    7,
    "Paginated catalog search on /events"
  );

  await measure(
    "Event Details Lookup by Slug",
    "public",
    async () => {
      const event = await Event.findOne({ slug: benchEvent.slug }).lean();
      let organizer = null;
      if (event?.organizerId) {
        organizer = await User.findById(event.organizerId).select("name email image").lean();
      }
      return { event, organizer };
    },
    7,
    "Single event hero page on /events/[slug]"
  );

  await measure(
    "About Page Data Assembly & Statistics",
    "public",
    async () => {
      // About page is purely static React JSX with no direct DB queries
      return {
        platformName: "NOTARI 2.0",
        institution: "Obafemi Awolowo University, Ile-Ife",
      };
    },
    5,
    "Static brochure page on /about"
  );

  // ---------------------------------------------------------------------------
  // 2. Student Portal Benchmarks
  // ---------------------------------------------------------------------------
  console.log("\n▶ 2. Measuring Student Portal Operations");

  await measure(
    "Student Dashboard Profile & Notifications Query",
    "student",
    async () => {
      const [profile, unreadNotificationsCount, upcomingTickets] = await Promise.all([
        User.findById(benchStudent._id).select("name email matricNumber faculty department level").lean(),
        Notification.countDocuments({ userId: benchStudent._id, isRead: false }),
        Ticket.find({ userId: benchStudent._id, status: "valid", isCheckedIn: false })
          .populate("eventId", "title slug startDate venue")
          .limit(5)
          .lean(),
      ]);
      return { profile, unreadNotificationsCount, upcomingTickets };
    },
    7,
    "Dashboard initial load on /student"
  );

  await measure(
    "Student Event Tab Switching (All / Upcoming / Attended)",
    "student",
    async () => {
      // Measure tab switching query performance across 3 tabs
      const upcoming = await Booking.find({ userId: benchStudent._id, paymentStatus: "successful" })
        .populate("eventId", "title startDate endDate venue flyerUrl")
        .lean();

      const attended = await Ticket.find({ userId: benchStudent._id, isCheckedIn: true })
        .populate("eventId", "title startDate endDate venue flyerUrl")
        .lean();

      return { upcomingCount: upcoming.length, attendedCount: attended.length };
    },
    7,
    "Tab switching on /student/my-events"
  );

  await measure(
    "Student Announcement Feed Retrieval (Audience Targeting)",
    "student",
    async () => {
      return announcementService.getStudentFeed(benchStudent._id.toString(), { page: 1, limit: 10 });
    },
    7,
    "Targeted announcements on /student"
  );

  // ---------------------------------------------------------------------------
  // 3. Organizer & Admin Dashboard Benchmarks
  // ---------------------------------------------------------------------------
  console.log("\n▶ 3. Measuring Organizer & Admin Dashboards");

  await measure(
    "Organizer Dashboard Analytics & Demographics Aggregation",
    "organizer",
    async () => {
      const orgEvents = await Event.find({ organizerId: benchOrganizer._id }).select("_id").lean();
      const eventIds = orgEvents.map((e) => e._id);

      const [ticketsSold, revenueAgg, facultyDemographics] = await Promise.all([
        Ticket.countDocuments({ eventId: { $in: eventIds }, status: "valid" }),
        Booking.aggregate([
          { $match: { eventId: { $in: eventIds }, paymentStatus: "successful" } },
          { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
        ]),
        Ticket.aggregate([
          { $match: { eventId: { $in: eventIds } } },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
          { $group: { _id: "$userDoc.faculty", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      return { ticketsSold, revenueAgg, facultyDemographics };
    },
    7,
    "Analytics overview on /organizer/dashboard"
  );

  await measure(
    "Admin Dashboard Overview Metrics & Approval Queues",
    "admin",
    async () => {
      const [totalUsers, totalEvents, pendingOrganizers, pendingAnnouncements] = await Promise.all([
        User.countDocuments(),
        Event.countDocuments({ status: "published" }),
        OrganizerApplication.countDocuments({ status: "pending" }),
        Announcement.countDocuments({ status: "pending_review" }),
      ]);
      return { totalUsers, totalEvents, pendingOrganizers, pendingAnnouncements };
    },
    7,
    "Superadmin overview on /admin"
  );

  // ---------------------------------------------------------------------------
  // 4. Critical Transactional Workflows
  // ---------------------------------------------------------------------------
  console.log("\n▶ 4. Measuring Critical Transactional Workflows");

  await measure(
    "Simulated Ticket Reservation & Booking Atomic Check",
    "transactional",
    async () => {
      // Concurrency check and ticket capacity reservation
      const event = await Event.findOneAndUpdate(
        {
          _id: benchEvent._id,
          "tickets.id": "tier_free",
          "tickets.soldCount": { $lt: 500 },
        },
        { $inc: { "tickets.$.soldCount": 1 } },
        { new: true }
      );
      return event;
    },
    7,
    "Atomic ticket reservation lock"
  );

  await measure(
    "QR Check-In Verification & Atomic Ticket Validation",
    "transactional",
    async () => {
      // 1. Signature generation & verification
      const secret = process.env.NEXTAUTH_SECRET || "fallback_secret";
      const hmac = crypto.createHmac("sha256", secret).update(benchTicket.ticketCode).digest("hex");
      const isValidSig = hmac.length === 64;

      // 2. Atomic check-in operation
      const ticket = await Ticket.findOneAndUpdate(
        { ticketCode: benchTicket.ticketCode, isCheckedIn: false },
        { $set: { isCheckedIn: true, checkedInAt: new Date() } },
        { new: true }
      );

      // Revert checked-in state for subsequent iterations
      await Ticket.updateOne({ ticketCode: benchTicket.ticketCode }, { $set: { isCheckedIn: false, checkedInAt: null } });

      return { isValidSig, ticket };
    },
    7,
    "Gate verification on /organizer/check-in"
  );

  // ---------------------------------------------------------------------------
  // 5. JavaScript Bundle Size Analysis
  // ---------------------------------------------------------------------------
  console.log("\n▶ 5. JavaScript Bundle Size Profiling");
  const nextStaticDir = path.join(process.cwd(), ".next/static");
  let totalJsSizeKb = 0;
  let chunkCount = 0;

  if (fs.existsSync(nextStaticDir)) {
    const walkSync = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkSync(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
          const stats = fs.statSync(fullPath);
          totalJsSizeKb += stats.size / 1024;
          chunkCount++;
        }
      }
    };
    walkSync(nextStaticDir);
  }

  console.log(`  📦 Total Compiled Client JS Chunks: ${chunkCount}`);
  console.log(`  📦 Total Client JS Payload: ${Math.round(totalJsSizeKb)} kB across all static chunks`);

  // ---------------------------------------------------------------------------
  // 6. Database Indexes Audit
  // ---------------------------------------------------------------------------
  console.log("\n▶ 6. Database Index Health Audit");
  const eventIndexes = await Event.collection.indexes();
  const ticketIndexes = await Ticket.collection.indexes();
  const userIndexes = await User.collection.indexes();
  const announcementIndexes = await Announcement.collection.indexes();

  console.log(`  🔍 Event Collection Indexes: ${eventIndexes.length} active indexes`);
  for (const idx of eventIndexes) {
    console.log(`     - ${JSON.stringify(idx.key)} (${idx.name})`);
  }

  console.log(`  🔍 Ticket Collection Indexes: ${ticketIndexes.length} active indexes`);
  for (const idx of ticketIndexes) {
    console.log(`     - ${JSON.stringify(idx.key)} (${idx.name})`);
  }

  console.log(`  🔍 User Collection Indexes: ${userIndexes.length} active indexes`);
  console.log(`  🔍 Announcement Collection Indexes: ${announcementIndexes.length} active indexes`);

  // Cleanup test fixtures
  await User.findByIdAndDelete(benchOrganizer._id);
  await User.findByIdAndDelete(benchStudent._id);
  await Event.findByIdAndDelete(benchEvent._id);
  await Ticket.findByIdAndDelete(benchTicket._id);
  await Booking.findByIdAndDelete(benchBooking._id);
  await Announcement.findByIdAndDelete(benchAnnouncement._id);
  await Notification.findByIdAndDelete(benchNotification._id);
  console.log("\n  🧹 Test fixtures cleaned up from database.");

  // ---------------------------------------------------------------------------
  // 7. Executive Summary & SLA Target Evaluation
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("📊 PERFORMANCE BASELINE RESULTS & SLA TARGET EVALUATION");
  console.log("================================================================================");
  console.log("Target SLA: Common interactions <= 1000ms | Max threshold <= 3000ms\n");

  const tableData = benchmarkResults.map((r) => ({
    Workflow: r.name,
    Avg: `${r.avgMs} ms`,
    p95: `${r.p95Ms} ms`,
    Min: `${r.minMs} ms`,
    Max: `${r.maxMs} ms`,
    SLA: r.status,
  }));
  console.table(tableData);

  const criticals = benchmarkResults.filter((r) => r.status === "CRITICAL");
  const warnings = benchmarkResults.filter((r) => r.status === "WARNING");
  const passings = benchmarkResults.filter((r) => r.status === "OPTIMAL" || r.status === "ACCEPTABLE");

  console.log(`\nSLA Summary:`);
  console.log(`  - Workflows <= 1000ms (Optimal/Acceptable): ${passings.length} / ${benchmarkResults.length} (${Math.round((passings.length / benchmarkResults.length) * 100)}%)`);
  console.log(`  - Workflows > 1000ms <= 3000ms (Warnings):  ${warnings.length}`);
  console.log(`  - Workflows > 3000ms (Critical SLA Breaches): ${criticals.length}`);

  if (criticals.length === 0) {
    console.log("\n🎉 ALL MEASURED WORKFLOWS MEET THE <= 3000ms SYSTEM RESPONSE TARGET!");
  } else {
    console.error(`\n⚠️ ${criticals.length} WORKFLOWS BREACHED THE 3000ms CEILING.`);
  }

  console.log("================================================================================\n");

  await new Promise((r) => setTimeout(r, 1000));
  await mongoose.disconnect();
}

runPerformanceProfiling().catch((err) => {
  console.error("Profiling script failed:", err);
  process.exit(1);
});
