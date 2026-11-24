/**
 * NOTARI 2.0 — Pre-Phase 5.9: About Page CTA & Faculty Integration Test Suite
 * Verifies:
 * 1. About page CTA secondary button styling, label, link, contrast, and accessibility.
 * 2. "Faculty of Computing Science and Engineering" official inclusion in OAU_FACULTIES.
 * 3. Prevention of duplicate faculty entries.
 * 4. Flexible faculty normalization and query regex.
 * 5. Student registration with Faculty of Computing Science and Engineering.
 * 6. Student profile update with Faculty of Computing Science and Engineering.
 * 7. Announcement audience targeting and filtering for Faculty of Computing Science and Engineering.
 * 8. Event filtering for Faculty of Computing Science and Engineering.
 */

import assert from "assert";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "../lib/database/mongoose";
import {
  OAU_FACULTIES,
  ALL_VALID_FACULTIES,
  normalizeFaculty,
  formatFacultyLabel,
  buildFacultyQueryRegex,
} from "../constants/oau";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { Announcement } from "../models/Announcement";
import { announcementService } from "../services/announcement.service";
import { updateStudentProfile } from "../lib/student/service";
import { registerSchema, organizerApplicationSchema } from "../validators/auth";
import { studentProfileUpdateSchema } from "../validators/student";

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

let totalCount = 0;
let passedCount = 0;

function it(description: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          passedCount++;
          console.log(`  ✅ PASS: ${description}`);
        })
        .catch((err) => {
          console.error(`  ❌ FAIL: ${description}`);
          console.error(`         ${err.message}`);
          throw err;
        });
    }
    passedCount++;
    console.log(`  ✅ PASS: ${description}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`         ${(err as Error).message}`);
    throw err;
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("🎯 NOTARI 2.0 — PRE-PHASE 5.9: UI DEFECT FIXES & FACULTY INTEGRATION SUITE");
  console.log("================================================================================\n");

  await connectToDatabase();
  console.log("  🔌 Connected to MongoDB Atlas.\n");

  const runId = Date.now();

  // ---------------------------------------------------------------------------
  // 1. About Page CTA Button Inspection
  // ---------------------------------------------------------------------------
  console.log("▶ 1. About Page CTA Verification");

  it("About page source contains restored 'Browse Events' label and accessible button markup", () => {
    const aboutPath = path.join(process.cwd(), "src/app/(public)/about/page.tsx");
    const content = fs.readFileSync(aboutPath, "utf-8");

    assert.ok(content.includes("Browse Events"), "About page must contain 'Browse Events' label");
    assert.ok(content.includes('href="/events"'), "Secondary CTA button must link to /events");
    assert.ok(content.includes("text-white"), "Text color must be white");
    assert.ok(content.includes("bg-transparent"), "Background must be transparent to avoid white-on-white defect");
    assert.ok(content.includes("border-slate-600"), "Border must be visible against dark card");
    assert.ok(content.includes("hover:bg-slate-800"), "Hover state must be defined");
    assert.ok(content.includes("focus-visible:ring-slate-400"), "Focus ring must be defined for keyboard accessibility");
  });

  // ---------------------------------------------------------------------------
  // 2. Faculty Options & Duplicate Prevention
  // ---------------------------------------------------------------------------
  console.log("\n▶ 2. Faculty Options & Canonical Definition");

  it("OAU_FACULTIES strictly includes 'Faculty of Computing Science and Engineering'", () => {
    assert.ok(
      (OAU_FACULTIES as readonly string[]).includes("Faculty of Computing Science and Engineering"),
      "'Faculty of Computing Science and Engineering' must be in OAU_FACULTIES"
    );
    assert.ok(
      ALL_VALID_FACULTIES.includes("Computing Science and Engineering"),
      "'Computing Science and Engineering' must be in ALL_VALID_FACULTIES"
    );
  });

  it("OAU_FACULTIES contains no duplicate entries", () => {
    const unique = new Set(OAU_FACULTIES);
    assert.strictEqual(unique.size, OAU_FACULTIES.length, "OAU_FACULTIES must not have duplicate entries");
  });

  it("formatFacultyLabel correctly formats both prefixed and unprefixed faculties", () => {
    assert.strictEqual(
      formatFacultyLabel("Faculty of Computing Science and Engineering"),
      "Faculty of Computing Science and Engineering"
    );
    assert.strictEqual(formatFacultyLabel("Technology"), "Faculty of Technology");
    assert.strictEqual(formatFacultyLabel("Science"), "Faculty of Science");
  });

  it("normalizeFaculty resolves aliases to canonical 'Faculty of Computing Science and Engineering'", () => {
    assert.strictEqual(
      normalizeFaculty("Computing Science and Engineering"),
      "Faculty of Computing Science and Engineering"
    );
    assert.strictEqual(
      normalizeFaculty("Faculty of Computing Science and Engineering"),
      "Faculty of Computing Science and Engineering"
    );
    assert.strictEqual(
      normalizeFaculty("faculty of computing science and engineering"),
      "Faculty of Computing Science and Engineering"
    );
    assert.strictEqual(normalizeFaculty("Technology"), "Technology");
  });

  it("buildFacultyQueryRegex matches both canonical and shorthand variants flexibly", () => {
    const regex1 = buildFacultyQueryRegex("Faculty of Computing Science and Engineering");
    assert.ok(regex1.test("Faculty of Computing Science and Engineering"), "Matches full canonical name");
    assert.ok(regex1.test("Computing Science and Engineering"), "Matches shorthand name");

    const regex2 = buildFacultyQueryRegex("Computing Science and Engineering");
    assert.ok(regex2.test("Faculty of Computing Science and Engineering"), "Regex from shorthand matches full canonical name");
    assert.ok(regex2.test("Computing Science and Engineering"), "Regex from shorthand matches shorthand name");
    assert.ok(!regex2.test("Faculty of Science"), "Regex does not falsely match other faculties");
  });

  // ---------------------------------------------------------------------------
  // 3. Schema & Validation Integration
  // ---------------------------------------------------------------------------
  console.log("\n▶ 3. Schema & API Validation Integration");

  it("registerSchema validates and normalizes Faculty of Computing Science and Engineering", () => {
    const res1 = registerSchema.safeParse({
      name: "Turing Student",
      email: `turing_${runId}@student.oauife.edu.ng`,
      password: "Password123!",
      matricNumber: "CSC/2021/001",
      faculty: "Faculty of Computing Science and Engineering",
      department: "Computer Science",
    });
    assert.ok(res1.success, "registerSchema accepts canonical faculty");
    if (res1.success) {
      assert.strictEqual(res1.data.faculty, "Faculty of Computing Science and Engineering");
    }

    const res2 = registerSchema.safeParse({
      name: "Lovelace Student",
      email: `lovelace_${runId}@student.oauife.edu.ng`,
      password: "Password123!",
      matricNumber: "CSC/2021/002",
      faculty: "Computing Science and Engineering",
      department: "Software Engineering",
    });
    assert.ok(res2.success, "registerSchema accepts shorthand and normalizes");
    if (res2.success) {
      assert.strictEqual(res2.data.faculty, "Faculty of Computing Science and Engineering");
    }
  });

  it("studentProfileUpdateSchema validates and normalizes faculty updates", () => {
    const res = studentProfileUpdateSchema.safeParse({
      name: "Updated Turing",
      faculty: "Computing Science and Engineering",
      department: "Computer Science",
    });
    assert.ok(res.success, "Profile update schema accepts faculty shorthand");
    if (res.success) {
      assert.strictEqual(res.data.faculty, "Faculty of Computing Science and Engineering");
    }
  });

  it("organizerApplicationSchema accepts Faculty of Computing Science and Engineering", () => {
    const res = organizerApplicationSchema.safeParse({
      organizationName: `NACOS OAU ${runId}`,
      category: "Academic",
      description: "Nigeria Association of Computing Students, Obafemi Awolowo University Chapter.",
      contactEmail: `nacos_${runId}@gmail.com`,
      contactPhone: "08012345678",
      faculty: "Faculty of Computing Science and Engineering",
    });
    assert.ok(res.success, "Organizer application accepts Faculty of Computing Science and Engineering");
  });

  // ---------------------------------------------------------------------------
  // 4. Persistence & Database Integration
  // ---------------------------------------------------------------------------
  console.log("\n▶ 4. Database Persistence & Profile Management");

  let cseStudentId: string | undefined = undefined;
  let scienceStudentId: string | undefined = undefined;

  await it("Creates student with Faculty of Computing Science and Engineering in database", async () => {
    const student = await User.create({
      name: `Computing Student ${runId}`,
      email: `cse_student_${runId}@student.oauife.edu.ng`,
      password: "HashedPassword123!",
      role: "student",
      matricNumber: `CSC/${runId.toString().slice(-4)}/01`,
      faculty: "Faculty of Computing Science and Engineering",
      department: "Computer Science",
      isVerified: true,
    });
    cseStudentId = student._id.toString();

    const fetched = await User.findById(cseStudentId);
    assert.ok(fetched, "Student must be persisted in database");
    assert.strictEqual(fetched.faculty, "Faculty of Computing Science and Engineering");
  });

  await it("Creates non-CSE student for audience exclusion verification", async () => {
    const student = await User.create({
      name: `Science Student ${runId}`,
      email: `science_student_${runId}@student.oauife.edu.ng`,
      password: "HashedPassword123!",
      role: "student",
      matricNumber: `CHM/${runId.toString().slice(-4)}/02`,
      faculty: "Science",
      department: "Chemistry",
      isVerified: true,
    });
    scienceStudentId = student._id.toString();
  });

  await it("updateStudentProfile persists Faculty of Computing Science and Engineering correctly", async () => {
    assert.ok(cseStudentId);
    const updateRes = await updateStudentProfile(cseStudentId!, {
      name: `Computing Student Updated ${runId}`,
      faculty: "Computing Science and Engineering", // Shorthand input
    });
    assert.strictEqual(updateRes.success, true, "Profile update must succeed");

    const fetched = await User.findById(cseStudentId!);
    assert.ok(fetched);
    assert.strictEqual(
      fetched.faculty,
      "Faculty of Computing Science and Engineering",
      "Persisted faculty must be normalized to canonical form"
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Audience Targeting & Event Filtering Integration
  // ---------------------------------------------------------------------------
  console.log("\n▶ 5. Audience Targeting & Event Query Integration");

  let announcementId: string | undefined = undefined;

  await it("Admin creates announcement targeted to Faculty of Computing Science and Engineering", async () => {
    const res = await announcementService.createAnnouncement(
      {
        id: new mongoose.Types.ObjectId().toString(),
        role: "admin",
        name: "OAU Administration",
      },
      {
        title: `CSE Hackathon & Coding Gala ${runId}`,
        summary: "Annual Faculty of Computing Science and Engineering software hackathon.",
        content: "All computing science and engineering students are invited to register for the upcoming codefest.",
        category: "faculty_announcements",
        targetAudience: {
          type: "faculty",
          faculty: "Faculty of Computing Science and Engineering",
        },
        status: "published",
      }
    );

    assert.strictEqual(res.success, true, "Announcement creation must succeed");
    assert.ok(res.announcement);
    announcementId = res.announcement._id.toString();
  });

  await it("Computing student receives the targeted announcement", async () => {
    assert.ok(cseStudentId);
    const res = await announcementService.getStudentFeed(cseStudentId!, { page: 1, limit: 10 });
    const found = res.announcements.some((a) => (a as { title?: string }).title?.includes(`CSE Hackathon & Coding Gala ${runId}`));
    assert.ok(found, "CSE student must receive announcement targeted to Faculty of Computing Science and Engineering");
  });

  await it("Science student is strictly excluded from receiving CSE announcement", async () => {
    assert.ok(scienceStudentId);
    const res = await announcementService.getStudentFeed(scienceStudentId!, { page: 1, limit: 10 });
    const found = res.announcements.some((a) => (a as { title?: string }).title?.includes(`CSE Hackathon & Coding Gala ${runId}`));
    assert.ok(!found, "Science student must NOT receive announcement targeted to CSE");
  });

  await it("Event query with faculty filter matches Faculty of Computing Science and Engineering events", async () => {
    const testEvent = await Event.create({
      title: `OAU Code Jam ${runId}`,
      slug: `oau-code-jam-${runId}`,
      description: "Annual hackathon event for students across Obafemi Awolowo University campus.",
      category: "Tech & Innovation",
      venue: "Faculty of Technology White House",
      faculty: "Faculty of Computing Science and Engineering",
      department: "Computer Science",
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      organizerId: new mongoose.Types.ObjectId().toString(),
      organizerName: "NACOS OAU Chapter",
      status: "published",
      tickets: [],
    });

    // Query using shorthand
    const shorthandRegex = buildFacultyQueryRegex("Computing Science and Engineering");
    const matchedShorthand = await Event.find({ faculty: shorthandRegex });
    assert.ok(
      matchedShorthand.some((e) => e._id.toString() === testEvent._id.toString()),
      "Query with shorthand matches event"
    );

    // Query using full canonical
    const canonicalRegex = buildFacultyQueryRegex("Faculty of Computing Science and Engineering");
    const matchedCanonical = await Event.find({ faculty: canonicalRegex });
    assert.ok(
      matchedCanonical.some((e) => e._id.toString() === testEvent._id.toString()),
      "Query with canonical matches event"
    );

    // Clean up test event
    await Event.findByIdAndDelete(testEvent._id);
  });

  // Clean up test records
  if (cseStudentId) await User.findByIdAndDelete(cseStudentId);
  if (scienceStudentId) await User.findByIdAndDelete(scienceStudentId);
  if (announcementId) await Announcement.findByIdAndDelete(announcementId);

  console.log("\n================================================================================");
  console.log(`🎉 TEST SUMMARY: ${passedCount} / ${totalCount} PASSED | 0 FAILED`);
  console.log("================================================================================\n");

  await new Promise((r) => setTimeout(r, 1000));
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
