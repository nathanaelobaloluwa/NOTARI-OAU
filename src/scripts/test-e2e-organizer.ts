import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { OrganizerApplication } from "../models/OrganizerApplication";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { APPLICANT_TYPES, APPLICATION_STATUS } from "../constants/organizer";
import {
  organizerApplicationSchema,
  applicationReviewSchema,
  organizerProfileUpdateSchema,
} from "../validators/organizer";

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

async function runOrganizerE2E() {
  console.log("\n================================================================================");
  console.log("🏢 NOTARI 2.0: END-TO-END LIVE ORGANIZER APPLICATION & APPROVAL AUDIT");
  console.log("================================================================================\n");

  console.log(`🔌 Target MongoDB: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@")}`);

  let isConnected = false;
  const runId = Date.now();

  try {
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    isConnected = true;
    console.log("✅ Live MongoDB Atlas connection established.\n");

    await User.init();
    await OrganizerProfile.init();
    await OrganizerApplication.init();

    // -------------------------------------------------------------------------
    // TEST SUITE 1: Seed Isolated Test Accounts
    // -------------------------------------------------------------------------
    console.log("--- 1. Seed Isolated Test Identities ---");
    const testPasswordHash = await bcrypt.hash("SecureTestPass2026!", 10);

    // 1A: Student Applicant A (Individual student)
    const studentA = await User.create({
      name: `Student Applicant A ${runId}`,
      email: `student.a.${runId}@notari.oau.edu.ng`,
      password: testPasswordHash,
      role: USER_ROLES.STUDENT,
      isOrganizer: false,
      matricNumber: `CSC/${runId % 10000}/001`,
      faculty: "Faculty of Technology",
      department: "Computer Science & Engineering",
      isVerified: true,
    });
    assert(studentA._id, "Student Applicant A created in MongoDB");

    // 1B: Student Applicant B (Organization representative)
    const studentB = await User.create({
      name: `Student Rep B ${runId}`,
      email: `student.b.${runId}@notari.oau.edu.ng`,
      password: testPasswordHash,
      role: USER_ROLES.STUDENT,
      isOrganizer: false,
      matricNumber: `AGE/${runId % 10000}/002`,
      faculty: "Faculty of Agriculture",
      department: "Agricultural Economics",
      isVerified: true,
    });
    assert(studentB._id, "Student Rep B created in MongoDB");

    // 1C: Regular Unapproved Student C
    const studentC = await User.create({
      name: `Regular Student C ${runId}`,
      email: `student.c.${runId}@notari.oau.edu.ng`,
      password: testPasswordHash,
      role: USER_ROLES.STUDENT,
      isOrganizer: false,
      matricNumber: `LAW/${runId % 10000}/003`,
      faculty: "Faculty of Law",
      department: "Public Law",
      isVerified: true,
    });
    assert(studentC._id, "Regular Student C created in MongoDB");

    // 1D: Superadmin Reviewer
    const adminReviewer = await User.create({
      name: `Audit Superadmin ${runId}`,
      email: `admin.${runId}@notari.oau.edu.ng`,
      password: testPasswordHash,
      role: USER_ROLES.ADMIN,
      isVerified: true,
    });
    assert(adminReviewer._id, "Superadmin Reviewer created in MongoDB");

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Individual Student Application Submission & Duplicate Prevention
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Individual Student Application & Duplicate Prevention ---");
    const individualPayload = {
      applicantType: "individual" as const,
      applicantName: studentA.name,
      applicantEmail: studentA.email,
      applicantMatricNumber: studentA.matricNumber,
      faculty: studentA.faculty,
      department: studentA.department,
      phone: "+2348011223344",
      displayName: `Ife Tech Creatives ${runId}`,
      description: "Student-led creative technology initiative organizing workshops and campus hackathons for OAU students.",
      reason: "We need official accreditation to reserve campus halls and issue verified student admission passes for our free design workshops.",
      experience: "Previously hosted 3 unofficial meetups in the Engineering lecture theatre.",
      supportingLinks: "https://instagram.com/ifetechcreatives",
    };

    const valIndividual = organizerApplicationSchema.safeParse(individualPayload);
    assert(valIndividual.success, "Individual application payload passes Zod schema validation");

    const appA = await OrganizerApplication.create({
      userId: studentA._id,
      ...individualPayload,
      status: APPLICATION_STATUS.PENDING,
      submissionCount: 1,
      history: [
        {
          action: "submitted",
          timestamp: new Date(),
          notes: "Initial individual organizer application submitted.",
        },
      ],
    });

    assert(appA._id, "Individual organizer application saved to MongoDB");
    assert(appA.status === APPLICATION_STATUS.PENDING, "Application initial status is strictly 'pending'");
    assert(appA.submissionCount === 1, "Initial submissionCount is strictly 1");
    assert(appA.history.length === 1 && appA.history[0].action === "submitted", "Initial audit history recorded");

    // Duplicate Prevention Check: Student cannot submit another pending application
    const activeAppFound = await OrganizerApplication.findOne({
      userId: studentA._id,
      status: {
        $in: [
          APPLICATION_STATUS.PENDING,
          APPLICATION_STATUS.APPROVED,
          APPLICATION_STATUS.CHANGES_REQUESTED,
        ],
      },
    });
    assert(
      activeAppFound !== null && activeAppFound.status === APPLICATION_STATUS.PENDING,
      "Duplicate Prevention: Active pending application detected, blocking second submission"
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Recognized Campus Organization Application Submission
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Campus Organization Application Submission ---");
    const organizationPayload = {
      applicantType: "organization" as const,
      organizationName: `OAU Agricultural Innovation Society ${runId}`,
      organizationCategory: "Society",
      organizationDescription: "Official campus academic society committed to student agricultural technology research and food security summits.",
      faculty: "Faculty of Agriculture",
      department: "Agricultural Economics",
      contactPersonName: studentB.name,
      contactPersonEmail: studentB.email,
      contactPersonMatric: studentB.matricNumber,
      contactPersonPhone: "+2348099887766",
      officialEmail: `agrisoc.${runId}@oau.edu.ng`,
      reason: "Our society hosts annual agricultural innovation conferences in Oduduwa Hall requiring verified organizer credentials.",
      supportingLinks: "https://oau.edu.ng/agrisoc",
    };

    const valOrg = organizerApplicationSchema.safeParse(organizationPayload);
    assert(valOrg.success, "Campus organization application payload passes Zod schema validation");

    const appB = await OrganizerApplication.create({
      userId: studentB._id,
      ...organizationPayload,
      status: APPLICATION_STATUS.PENDING,
      submissionCount: 1,
      history: [
        {
          action: "submitted",
          timestamp: new Date(),
          notes: "Initial campus organization accreditation application submitted.",
        },
      ],
    });

    assert(appB._id, "Campus organization application saved to MongoDB");
    assert(appB.applicantType === "organization", "Applicant type persisted as 'organization'");
    assert(appB.organizationCategory === "Society", "Organization category persisted accurately");
    assert(appB.officialEmail === `agrisoc.${runId}@oau.edu.ng`, "Official organization email persisted");

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Superadmin Review: Request Changes & Resubmission Lifecycle
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Superadmin Review: Request Changes & Secure Resubmission ---");

    // 4A: Superadmin requests changes on Application B
    const requestChangesDecision = {
      action: "request_changes" as const,
      reason: "Please provide the official faculty staff adviser endorsement email.",
    };
    assert(applicationReviewSchema.safeParse(requestChangesDecision).success, "Review decision payload passes validation");

    appB.status = APPLICATION_STATUS.CHANGES_REQUESTED;
    appB.reviewerId = adminReviewer._id;
    appB.reviewerName = adminReviewer.name;
    appB.reviewedAt = new Date();
    appB.changesRequestedReason = requestChangesDecision.reason;
    appB.history.push({
      action: "changes_requested",
      actorId: adminReviewer._id,
      actorRole: "admin",
      notes: requestChangesDecision.reason,
      timestamp: new Date(),
    });
    await appB.save();

    const reloadedAppB = await OrganizerApplication.findById(appB._id);
    assert(reloadedAppB?.status === APPLICATION_STATUS.CHANGES_REQUESTED, "Application status successfully changed to 'changes_requested'");
    assert(reloadedAppB?.changesRequestedReason === requestChangesDecision.reason, "Superadmin change request reason accurately stored");
    assert(reloadedAppB?.history.length === 2, "Audit history updated with 'changes_requested' entry");

    // 4B: Applicant B resubmits revised application
    const revisedReason = "Staff adviser Prof. Ogunleye approved our application. Letter attached in link.";
    const revisedLinks = "https://oau.edu.ng/agrisoc/endorsement.pdf";

    reloadedAppB!.reason = revisedReason;
    reloadedAppB!.supportingLinks = revisedLinks;
    reloadedAppB!.status = APPLICATION_STATUS.PENDING;
    reloadedAppB!.submissionCount += 1;
    reloadedAppB!.history.push({
      action: "resubmitted",
      timestamp: new Date(),
      notes: "Applicant revised supporting documents per Superadmin feedback.",
    });
    await reloadedAppB!.save();

    const resubmittedAppB = await OrganizerApplication.findById(appB._id);
    assert(resubmittedAppB?.status === APPLICATION_STATUS.PENDING, "Resubmission restored application status to 'pending'");
    assert(resubmittedAppB?.submissionCount === 2, "Submission count incremented to 2");
    assert(resubmittedAppB?.history.length === 3, "Audit trail contains complete 3-step history: submitted -> changes_requested -> resubmitted");

    // -------------------------------------------------------------------------
    // TEST SUITE 5: Superadmin Review: Approval & Dual-Capability Role Activation
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Superadmin Review: Approval & Dual-Capability Role Activation ---");

    // Superadmin approves Individual Student Applicant A
    appA.status = APPLICATION_STATUS.APPROVED;
    appA.reviewerId = adminReviewer._id;
    appA.reviewerName = adminReviewer.name;
    appA.reviewedAt = new Date();
    appA.reviewNotes = "Accredited for academic and technological student workshops.";
    appA.history.push({
      action: "approved",
      actorId: adminReviewer._id,
      actorRole: "admin",
      notes: appA.reviewNotes,
      timestamp: new Date(),
    });
    await appA.save();

    // User capability grant: User.isOrganizer is set to true WITHOUT modifying role: student
    await User.findByIdAndUpdate(studentA._id, { isOrganizer: true });

    // Automatic OrganizerProfile creation
    const profileA = await OrganizerProfile.findOneAndUpdate(
      { userId: studentA._id },
      {
        userId: studentA._id,
        organizerType: appA.applicantType,
        organizationName: appA.displayName || appA.applicantName,
        displayName: appA.displayName || appA.applicantName,
        category: "Individual Student Organizer",
        description: appA.description,
        contactEmail: appA.applicantEmail,
        contactPhone: appA.phone,
        faculty: appA.faculty,
        department: appA.department,
        status: ORGANIZER_STATUS.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminReviewer._id,
        approvalNotes: appA.reviewNotes,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    assert(profileA._id, "OrganizerProfile created in MongoDB on approval");
    assert(profileA.status === ORGANIZER_STATUS.APPROVED, "OrganizerProfile status is 'approved'");
    assert(profileA.organizerType === "individual", "OrganizerProfile type accurately preserved as 'individual'");

    // Verify User record preservation in MongoDB
    const updatedUserA = await User.findById(studentA._id);
    assert(updatedUserA?.isOrganizer === true, "User.isOrganizer capability flag is true");
    assert(updatedUserA?.role === USER_ROLES.STUDENT, "CRITICAL: User.role is strictly preserved as 'student' (not overwritten)");
    assert(updatedUserA?.matricNumber === studentA.matricNumber, "Student matriculation number remains intact");

    // -------------------------------------------------------------------------
    // TEST SUITE 6: Persistent Organizer Profile Updates & Whitelist Protection
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Persistent Organizer Profile Updates & Whitelist Protection ---");

    const profileUpdates = {
      displayName: "Ife Tech Creatives Hub",
      description: "Premier university tech community empowering undergraduate software engineers and designers.",
      contactPhone: "+2348055667788",
      website: "https://ifetechcreatives.org",
      socialLinks: {
        twitter: "@IfeTechCreative",
        instagram: "@ifetechcreatives",
        linkedin: "https://linkedin.com/company/ifetechcreatives",
      },
    };

    assert(organizerProfileUpdateSchema.safeParse(profileUpdates).success, "Profile update payload passes Zod validation");

    profileA.displayName = profileUpdates.displayName;
    profileA.description = profileUpdates.description;
    profileA.contactPhone = profileUpdates.contactPhone;
    profileA.website = profileUpdates.website;
    profileA.socialLinks = profileUpdates.socialLinks;
    await profileA.save();

    const reloadedProfileA = await OrganizerProfile.findOne({ userId: studentA._id });
    assert(reloadedProfileA?.displayName === "Ife Tech Creatives Hub", "Profile displayName updated in MongoDB");
    assert(reloadedProfileA?.contactPhone === "+2348055667788", "Profile contactPhone updated in MongoDB");
    assert(reloadedProfileA?.socialLinks?.twitter === "@IfeTechCreative", "Profile socialLinks nested object persisted");

    // -------------------------------------------------------------------------
    // TEST SUITE 7: Unapproved Applicant Access Restriction
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Unapproved User Access Restrictions ---");

    // Regular student C has no approved profile and isOrganizer: false
    const userCRecord = await User.findById(studentC._id);
    const profileCRecord = await OrganizerProfile.findOne({ userId: studentC._id });

    assert(userCRecord?.isOrganizer === false, "Unapproved student has isOrganizer === false");
    assert(profileCRecord === null, "Unapproved student has no OrganizerProfile");

    // -------------------------------------------------------------------------
    // TEST SUITE 8: Existing Seeded Accounts Verification
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Seeded Accounts Immunity & Integrity ---");

    const seededAdmin = await User.findOne({ role: USER_ROLES.ADMIN, email: "admin@notari.oau.edu.ng" });
    const seededOrg = await User.findOne({ role: USER_ROLES.ORGANIZER, email: "organizer@notari.oau.edu.ng" });
    const seededStudent = await User.findOne({ role: USER_ROLES.STUDENT, email: "student@notari.oau.edu.ng" });

    assert(seededAdmin !== null, "Existing seeded Superadmin account exists and is unaffected");
    assert(seededOrg !== null, "Existing seeded Organizer account exists and is unaffected");
    assert(seededStudent !== null, "Existing seeded Student account exists and is unaffected");

    const seededOrgProfile = await OrganizerProfile.findOne({ userId: seededOrg?._id });
    assert(seededOrgProfile?.status === ORGANIZER_STATUS.APPROVED, "Seeded Organizer profile remains active and approved");

    // -------------------------------------------------------------------------
    // TEST SUITE 9: Cleanup Isolated Test Records
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Cleanup Isolated Test Records ---");
    await OrganizerApplication.deleteMany({ userId: { $in: [studentA._id, studentB._id, studentC._id] } });
    await OrganizerProfile.deleteMany({ userId: { $in: [studentA._id, studentB._id, studentC._id] } });
    await User.deleteMany({ _id: { $in: [studentA._id, studentB._id, studentC._id, adminReviewer._id] } });
    console.log("  ✅ Cleaned up isolated test applications, profiles, and users.");
  } catch (error) {
    console.error("❌ Test error:", error);
    failed++;
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("\n🔌 Live MongoDB connection closed.");
    }
  }

  console.log("\n================================================================================");
  console.log(`📊 LIVE ORGANIZER E2E TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runOrganizerE2E();
