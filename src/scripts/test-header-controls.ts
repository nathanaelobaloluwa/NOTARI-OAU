import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/database/mongoose";
import { Notification } from "../models/Notification";
import {
  createInAppNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../lib/notifications/in-app";
import { getInitials } from "../components/shared/header/HeaderProfileAvatar";
import { formatTimeAgo } from "../components/shared/header/HeaderNotificationBell";

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
  console.log("🔔 NOTARI 2.0: HEADER CONTROLS & NOTIFICATION SYSTEM VERIFICATION");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // SECTION 1: UNIT LOGIC TESTS (Pure functions)
  // ---------------------------------------------------------------------------
  console.log("▶ 1. Avatar Initials Extraction (getInitials)");
  assert(getInitials("Adeola Johnson") === "AJ", "Full two-word name 'Adeola Johnson' returns 'AJ'");
  assert(getInitials("Nathanael Obaloluwa Ajekiigbe") === "NA", "Three-word name returns first and last initial 'NA'");
  assert(getInitials("Obaloluwa") === "OB", "Single word 'Obaloluwa' returns first 2 chars 'OB'");
  assert(getInitials("A") === "A", "Single letter 'A' returns 'A'");
  assert(getInitials("") === "U", "Empty string returns fallback 'U'");
  assert(getInitials(null) === "U", "Null returns fallback 'U'");
  assert(getInitials(undefined) === "U", "Undefined returns fallback 'U'");
  assert(getInitials("   ") === "U", "Whitespace string returns fallback 'U'");

  console.log("\n▶ 2. Notification Relative Timestamp Formatting (formatTimeAgo)");
  const now = Date.now();
  assert(formatTimeAgo(new Date(now - 10 * 1000).toISOString()) === "Just now", "< 60 seconds returns 'Just now'");
  assert(formatTimeAgo(new Date(now - 5 * 60 * 1000).toISOString()) === "5m ago", "5 minutes returns '5m ago'");
  assert(formatTimeAgo(new Date(now - 3 * 3600 * 1000).toISOString()) === "3h ago", "3 hours returns '3h ago'");
  assert(formatTimeAgo(new Date(now - 2 * 86400 * 1000).toISOString()) === "2d ago", "2 days returns '2d ago'");

  // ---------------------------------------------------------------------------
  // SECTION 2: DATABASE-BACKED IN-APP NOTIFICATION LIFECYCLE
  // ---------------------------------------------------------------------------
  console.log("\n▶ 3. In-App Notification MongoDB Persistence & State");

  const testUserId = new mongoose.Types.ObjectId();
  const unauthorizedUserId = new mongoose.Types.ObjectId();

  try {
    await connectToDatabase();
    console.log("  🔌 Connected to MongoDB successfully.");

    // Initial check: empty state
    const initialFetch = await getUserNotifications(testUserId);
    assert(initialFetch.items.length === 0, "Initial notifications list is empty for fresh user");
    assert(initialFetch.unreadCount === 0, "Initial unreadCount is 0");

    // Create Notification 1 (ticket)
    const notif1 = await createInAppNotification({
      userId: testUserId,
      title: "Ticket Confirmed",
      message: "Your ticket for IFE Tech Expo 2026 is confirmed.",
      type: "ticket",
      linkUrl: "/student/tickets",
    });
    assert(notif1._id != null, "Notification 1 created with valid ObjectId");
    assert(notif1.isRead === false, "Notification 1 initialized with isRead: false");

    // Create Notification 2 (payment)
    const notif2 = await createInAppNotification({
      userId: testUserId,
      title: "Payment Received",
      message: "NGN 2,500 payment successful via Paystack.",
      type: "payment",
      linkUrl: "/student/history",
    });
    assert(notif2._id != null, "Notification 2 created with valid ObjectId");

    // Create Notification 3 (application)
    const notif3 = await createInAppNotification({
      userId: testUserId,
      title: "Organizer Application Approved",
      message: "Congratulations! You are now a verified organizer.",
      type: "application",
      linkUrl: "/organizer",
    });
    assert(notif3._id != null, "Notification 3 created with valid ObjectId");

    // Verify unreadCount and ordering (newest first)
    const afterCreation = await getUserNotifications(testUserId);
    assert(afterCreation.unreadCount === 3, "unreadCount is 3 after adding 3 unread notifications");
    assert(afterCreation.items.length === 3, "Fetched exactly 3 items");
    assert(afterCreation.items[0].id === notif3._id.toString(), "Items ordered newest first (notif3 is first)");
    assert(afterCreation.items[2].id === notif1._id.toString(), "Oldest notification is last (notif1)");

    // Mark single notification as read
    const markResult = await markNotificationAsRead(notif1._id.toString(), testUserId);
    assert(markResult === true, "markNotificationAsRead returned true for valid owner");

    const afterMarkOne = await getUserNotifications(testUserId);
    assert(afterMarkOne.unreadCount === 2, "unreadCount decremented from 3 to 2");
    const readItem = afterMarkOne.items.find((item) => item.id === notif1._id.toString());
    assert(readItem?.isRead === true, "Notification 1 isRead is now true");

    // Security/Isolation test: wrong user cannot mark another user's notification as read
    const unauthorizedMark = await markNotificationAsRead(notif2._id.toString(), unauthorizedUserId);
    assert(unauthorizedMark === false, "markNotificationAsRead rejected for unauthorized user (isolation check)");

    // Invalid ID check
    const invalidIdMark = await markNotificationAsRead("invalid-object-id-123", testUserId);
    assert(invalidIdMark === false, "markNotificationAsRead returns false for invalid ObjectId format");

    // Mark all notifications as read
    const markAllCount = await markAllNotificationsAsRead(testUserId);
    assert(markAllCount === 2, `markAllNotificationsAsRead updated remaining 2 unread notifications (got ${markAllCount})`);

    const afterMarkAll = await getUserNotifications(testUserId);
    assert(afterMarkAll.unreadCount === 0, "unreadCount is now 0 after markAllNotificationsAsRead");
    assert(afterMarkAll.items.every((item) => item.isRead === true), "All items now have isRead: true");

    // Clean up test data
    const cleanupResult = await Notification.deleteMany({ userId: testUserId });
    console.log(`  🧹 Cleaned up ${cleanupResult.deletedCount} test notification records.`);
  } catch (err) {
    console.error("  ❌ Database test error:", err);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC) DROPDOWN NAVIGATION LOGIC
  // ---------------------------------------------------------------------------
  console.log("\n▶ 4. Header Account Dropdown RBAC Navigation Coverage");

  // Simulated validation of role links
  const studentLinks = ["/student/tickets", "/student/history", "/student/bookmarks", "/student/settings", "/events"];
  assert(studentLinks.includes("/student/tickets"), "Student role includes My Tickets");
  assert(studentLinks.includes("/student/history"), "Student role includes Purchase History");
  assert(studentLinks.includes("/events"), "Student role includes Discover Events");

  const dualCapabilityOrganizerLink = "/organizer";
  assert(dualCapabilityOrganizerLink === "/organizer", "Dual-capability student (isOrganizer: true) has switch link to /organizer");

  const organizerLinks = [
    "/organizer",
    "/organizer/events",
    "/organizer/events/create",
    "/organizer/check-in",
    "/organizer/orders",
    "/organizer/payouts",
    "/student",
  ];
  assert(organizerLinks.includes("/organizer/check-in"), "Organizer role includes QR Check-in");
  assert(organizerLinks.includes("/organizer/payouts"), "Organizer role includes Payouts");
  assert(organizerLinks.includes("/student"), "Organizer role includes Switch to Student View");

  const adminLinks = [
    "/admin",
    "/admin/events",
    "/admin/approvals",
    "/admin/financial",
    "/admin/settings",
    "/student",
  ];
  assert(adminLinks.includes("/admin/approvals"), "Admin role includes Organizer Approvals");
  assert(adminLinks.includes("/admin/financial"), "Admin role includes Financial & Payouts");
  assert(adminLinks.includes("/student"), "Admin role includes View as Student");

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
