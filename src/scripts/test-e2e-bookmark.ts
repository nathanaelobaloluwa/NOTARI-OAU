import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { Bookmark } from "../models/Bookmark";
import { USER_ROLES } from "../constants/roles";
import { EVENT_STATUS, EVENT_CATEGORIES } from "../constants/oau";
import {
  saveBookmark,
  removeBookmark,
  getStudentBookmarks,
  getStudentSavedCount,
} from "../lib/bookmarks/service";

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

async function runBookmarkE2E() {
  console.log("\n================================================================================");
  console.log("🔖 NOTARI 2.0: END-TO-END LIVE SAVED EVENTS & BOOKMARKS SYSTEM AUDIT");
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
    await User.deleteMany({ email: { $regex: /^test_bm_/ } });
    await Event.deleteMany({ slug: { $regex: /^test-bm-event-/ } });

    console.log("--- 1. Seed Isolated Test Data (Students, Organizer, Admin, Events) ---");

    // Student A
    const studentA = await User.create({
      name: `Student Alpha ${runId}`,
      email: `test_bm_student_a_${runId}@oau.edu.ng`,
      password: "HashedPassword123!",
      role: USER_ROLES.STUDENT,
      matricNumber: `CSC/${runId % 10000}/001`,
      faculty: "Faculty of Technology",
      department: "Computer Science and Engineering",
    });

    // Student B
    const studentB = await User.create({
      name: `Student Beta ${runId}`,
      email: `test_bm_student_b_${runId}@oau.edu.ng`,
      password: "HashedPassword123!",
      role: USER_ROLES.STUDENT,
      matricNumber: `CSC/${runId % 10000}/002`,
      faculty: "Faculty of Technology",
      department: "Computer Science and Engineering",
    });

    // Organizer
    const organizer = await User.create({
      name: `Tech Club OAU ${runId}`,
      email: `test_bm_organizer_${runId}@oau.edu.ng`,
      password: "HashedPassword123!",
      role: USER_ROLES.ORGANIZER,
    });

    // Admin
    const admin = await User.create({
      name: `DSA Admin ${runId}`,
      email: `test_bm_admin_${runId}@oau.edu.ng`,
      password: "HashedPassword123!",
      role: USER_ROLES.ADMIN,
    });

    // Published Event 1
    const event1 = await Event.create({
      title: `Great Ife Hackathon ${runId}`,
      slug: `test-bm-event-hackathon-${runId}`,
      description: "Annual competitive coding and hardware hackathon at Oduduwa Hall.",
      organizerId: organizer._id,
      organizerName: "Tech Club OAU",
      venue: "Oduduwa Hall Foyer, OAU Campus",
      startDate: new Date(Date.now() + 86400000 * 3),
      endDate: new Date(Date.now() + 86400000 * 4),
      category: EVENT_CATEGORIES[0], // Academic & Educational
      status: EVENT_STATUS.PUBLISHED,
      isFree: true,
      ticketTiers: [
        {
          name: "Free Pass",
          price: 0,
          capacity: 100,
          available: 100,
          maxPerOrder: 2,
        },
      ],
    });

    // Published Event 2
    const event2 = await Event.create({
      title: `Campus Leadership Summit ${runId}`,
      slug: `test-bm-event-summit-${runId}`,
      description: "Inter-faculty student leadership forum at Amphitheatre.",
      organizerId: organizer._id,
      organizerName: "Tech Club OAU",
      venue: "Amphitheatre, OAU Campus",
      startDate: new Date(Date.now() + 86400000 * 7),
      endDate: new Date(Date.now() + 86400000 * 8),
      category: EVENT_CATEGORIES[2],
      status: EVENT_STATUS.PUBLISHED,
      isFree: false,
      ticketTiers: [
        {
          name: "Standard",
          price: 1500,
          capacity: 50,
          available: 50,
          maxPerOrder: 1,
        },
      ],
    });

    // Draft / Unpublished Event 3
    const draftEvent = await Event.create({
      title: `Secret Unapproved Gathering ${runId}`,
      slug: `test-bm-event-draft-${runId}`,
      description: "An unpublished draft event pending DSA approval.",
      organizerId: organizer._id,
      organizerName: "Tech Club OAU",
      venue: "Sub Car Park",
      startDate: new Date(Date.now() + 86400000 * 5),
      endDate: new Date(Date.now() + 86400000 * 6),
      category: EVENT_CATEGORIES[1],
      status: EVENT_STATUS.DRAFT,
      isFree: true,
      ticketTiers: [{ name: "Free", price: 0, capacity: 50, available: 50 }],
    });

    assert(Boolean(studentA._id && studentB._id), "Isolated student accounts created");
    assert(Boolean(event1._id && event2._id && draftEvent._id), "Test events created in Atlas");

    // TEST SUITE 2: Save Bookmark (Student A saves Event 1)
    console.log("\n--- 2. Save Bookmark by Authenticated Student ---");
    const saveRes1 = await saveBookmark({
      userId: studentA._id.toString(),
      eventId: event1._id.toString(),
    });

    assert(saveRes1.success && saveRes1.status === 201, "Student A successfully bookmarks Event 1 (Status 201)");
    assert(
      (saveRes1.data as { alreadySaved?: boolean })?.alreadySaved === false,
      "Response confirms new bookmark created (alreadySaved: false)"
    );

    const docInDb = await Bookmark.findOne({
      userId: studentA._id,
      eventId: event1._id,
    });
    assert(Boolean(docInDb), "Bookmark document exists in MongoDB with matching userId and eventId");

    // TEST SUITE 3: Duplicate Bookmark Prevention & Idempotency
    console.log("\n--- 3. Duplicate Bookmark Prevention & Compound Unique Index ---");
    const duplicateRes = await saveBookmark({
      userId: studentA._id.toString(),
      eventId: event1._id.toString(),
    });

    assert(
      duplicateRes.success && duplicateRes.status === 200,
      "Second bookmark attempt returns idempotent success (Status 200)"
    );
    assert(
      (duplicateRes.data as { alreadySaved?: boolean })?.alreadySaved === true,
      "Response flags event as alreadySaved: true without throwing error"
    );

    const bookmarkCountForEvent1 = await Bookmark.countDocuments({
      userId: studentA._id,
      eventId: event1._id,
    });
    assert(
      bookmarkCountForEvent1 === 1,
      "Database confirms exactly 1 bookmark document exists (no duplicate created)"
    );

    // Verify direct Mongoose duplicate insertion throws code 11000
    let caughtDuplicateError = false;
    try {
      await Bookmark.create({
        userId: studentA._id,
        eventId: event1._id,
      });
    } catch (err: unknown) {
      const mongoErr = err as { code?: number };
      if (mongoErr.code === 11000) {
        caughtDuplicateError = true;
      }
    }
    assert(
      caughtDuplicateError,
      "MongoDB compound unique index { userId: 1, eventId: 1 } strictly rejects duplicate insert (code 11000)"
    );

    // TEST SUITE 4: Role-Based Access Control (RBAC) Enforcement
    console.log("\n--- 4. Role Authorization Enforcement ---");
    const organizerBookmarkRes = await saveBookmark({
      userId: organizer._id.toString(),
      eventId: event1._id.toString(),
    });
    assert(
      !organizerBookmarkRes.success && organizerBookmarkRes.status === 403,
      "Organizer attempting to bookmark is rejected with 403 Forbidden"
    );

    const adminBookmarkRes = await saveBookmark({
      userId: admin._id.toString(),
      eventId: event1._id.toString(),
    });
    assert(
      !adminBookmarkRes.success && adminBookmarkRes.status === 403,
      "Admin attempting to bookmark is rejected with 403 Forbidden"
    );

    // TEST SUITE 5: Unpublished Event Rejection
    console.log("\n--- 5. Unpublished Event Protection ---");
    const draftBookmarkRes = await saveBookmark({
      userId: studentA._id.toString(),
      eventId: draftEvent._id.toString(),
    });
    assert(
      !draftBookmarkRes.success && draftBookmarkRes.status === 400,
      "Attempting to bookmark unpublished/draft event is rejected with 400 Bad Request"
    );

    // TEST SUITE 6: Multi-Event Retrieval & IDs Query
    console.log("\n--- 6. Multi-Event Bookmark Retrieval & Active Count ---");
    // Student A saves Event 2
    await saveBookmark({
      userId: studentA._id.toString(),
      eventId: event2._id.toString(),
    });

    const studentASavedCount = await getStudentSavedCount(studentA._id.toString());
    assert(studentASavedCount === 2, `getStudentSavedCount returns exactly 2 (actual: ${studentASavedCount})`);

    // Fetch IDs only
    const idsOnlyRes = await getStudentBookmarks(studentA._id.toString(), true);
    assert(idsOnlyRes.success && idsOnlyRes.status === 200, "getStudentBookmarks(idsOnly=true) succeeds");
    const savedIdsData = idsOnlyRes.data as { savedEventIds: string[]; count: number };
    assert(
      savedIdsData.count === 2 &&
        savedIdsData.savedEventIds.includes(event1._id.toString()) &&
        savedIdsData.savedEventIds.includes(event2._id.toString()),
      "IDs-only retrieval contains both event 1 and event 2 IDs"
    );

    // Fetch populated bookmarks
    const populatedRes = await getStudentBookmarks(studentA._id.toString(), false);
    assert(populatedRes.success && populatedRes.status === 200, "getStudentBookmarks(populated) succeeds");
    const populatedData = populatedRes.data as {
      bookmarks: Array<{ id: string; event: { id: string; title: string; isFree: boolean } }>;
      count: number;
    };
    assert(populatedData.count === 2, "Populated bookmarks array has 2 items");
    assert(
      populatedData.bookmarks.some((b) => b.event.id === event1._id.toString() && b.event.isFree === true),
      "Populated bookmark includes Event 1 details (title, isFree, venue)"
    );

    // TEST SUITE 7: Cross-Student Isolation
    console.log("\n--- 7. Cross-Student Data Isolation ---");
    const studentBBookmarks = await getStudentBookmarks(studentB._id.toString(), false);
    const studentBData = studentBBookmarks.data as { bookmarks: unknown[]; count: number };
    assert(
      studentBData.count === 0,
      "Student B cannot see Student A's bookmarks (count is 0)"
    );

    // Student B attempts to remove Student A's bookmark
    const crossRemoveRes = await removeBookmark({
      userId: studentB._id.toString(),
      eventId: event1._id.toString(),
    });
    assert(
      crossRemoveRes.success && (crossRemoveRes.data as { removed?: boolean })?.removed === false,
      "Student B cannot delete Student A's bookmark (removed: false)"
    );

    const docStillExists = await Bookmark.findOne({
      userId: studentA._id,
      eventId: event1._id,
    });
    assert(Boolean(docStillExists), "Student A's bookmark remains intact after cross-student deletion attempt");

    // TEST SUITE 8: Remove Bookmark & Count Update
    console.log("\n--- 8. Bookmark Removal & Count Verification ---");
    const removeRes = await removeBookmark({
      userId: studentA._id.toString(),
      eventId: event1._id.toString(),
    });

    assert(removeRes.success && removeRes.status === 200, "removeBookmark succeeds with 200 OK");
    assert(
      (removeRes.data as { removed?: boolean })?.removed === true,
      "Response confirms bookmark was removed (removed: true)"
    );

    const docAfterDelete = await Bookmark.findOne({
      userId: studentA._id,
      eventId: event1._id,
    });
    assert(!docAfterDelete, "Bookmark document for Event 1 is removed from MongoDB");

    const updatedCount = await getStudentSavedCount(studentA._id.toString());
    assert(updatedCount === 1, `getStudentSavedCount updates to 1 (actual: ${updatedCount})`);

    // Removing again is safe and returns removed: false
    const removeAgainRes = await removeBookmark({
      userId: studentA._id.toString(),
      eventId: event1._id.toString(),
    });
    assert(
      removeAgainRes.success && (removeAgainRes.data as { removed?: boolean })?.removed === false,
      "Repeated removal is safe and reports removed: false"
    );

    // TEST SUITE 9: Cascade Cleanup & Post-Verification
    console.log("\n--- 9. Cleanup & Teardown Verification ---");
    await Bookmark.deleteMany({ userId: { $in: [studentA._id, studentB._id] } });
    await Event.deleteMany({ _id: { $in: [event1._id, event2._id, draftEvent._id] } });
    await User.deleteMany({ _id: { $in: [studentA._id, studentB._id, organizer._id, admin._id] } });

    const remainingBookmarks = await Bookmark.countDocuments({
      userId: { $in: [studentA._id, studentB._id] },
    });
    assert(remainingBookmarks === 0, "All test bookmarks safely purged from live database");

    console.log("\n================================================================================");
    console.log(`📊 BOOKMARK E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Fatal error during Bookmark E2E testing:", error);
    process.exit(1);
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("🔌 Live MongoDB connection closed.");
    }
  }
}

runBookmarkE2E();
