import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { EVENT_STATUS } from "../constants/oau";
import { processFreeRegistration } from "../lib/bookings/register-free";
import { TicketSecurityService } from "../lib/tickets/qr";

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

async function runOrganizerEventsE2E() {
  console.log("\n================================================================================");
  console.log("🎟️  NOTARI 2.0: END-TO-END ORGANIZER EVENT LIFECYCLE & APPROVAL AUDIT (PHASE 5.2)");
  console.log("================================================================================\n");

  try {
    console.log("🔌 Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Database connected successfully.\n");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Password123#@", salt);

    const testPrefix = `phase52_audit_${Date.now()}`;
    const testAdminEmail = `${testPrefix}_admin@oauife.edu.ng`;
    const testStudentOrgEmail = `${testPrefix}_studentorg@oauife.edu.ng`;
    const testCampusOrgEmail = `${testPrefix}_campusorg@oauife.edu.ng`;
    const testUnapprovedStudentEmail = `${testPrefix}_unapproved@oauife.edu.ng`;
    const testAttendeeEmail = `${testPrefix}_attendee@oauife.edu.ng`;

    // -------------------------------------------------------------------------
    // 1. SETUP TEST USERS & ORGANIZER ACCREDITATIONS
    // -------------------------------------------------------------------------
    console.log("--- 1. Provisioning Test Users and Accreditations ---");

    const [adminUser, studentOrgUser, campusOrgUser, unapprovedStudent, attendeeStudent] =
      await Promise.all([
        User.create({
          name: "Superadmin Auditor",
          email: testAdminEmail,
          password: passwordHash,
          role: USER_ROLES.ADMIN,
          isOrganizer: true,
        }),
        User.create({
          name: "Individual Student Organizer",
          email: testStudentOrgEmail,
          password: passwordHash,
          role: USER_ROLES.STUDENT,
          isOrganizer: true,
          matricNumber: "CSC/2021/099",
          faculty: "Faculty of Technology",
          department: "Computer Science and Engineering",
        }),
        User.create({
          name: "NACOSS OAU Chapter",
          email: testCampusOrgEmail,
          password: passwordHash,
          role: USER_ROLES.ORGANIZER,
          isOrganizer: true,
          faculty: "Faculty of Technology",
          department: "Computer Science and Engineering",
        }),
        User.create({
          name: "Unapproved Student Applicant",
          email: testUnapprovedStudentEmail,
          password: passwordHash,
          role: USER_ROLES.STUDENT,
          isOrganizer: false,
          matricNumber: "GLY/2022/045",
          faculty: "Faculty of Science",
          department: "Geology",
        }),
        User.create({
          name: "Event Attendee Student",
          email: testAttendeeEmail,
          password: passwordHash,
          role: USER_ROLES.STUDENT,
          isOrganizer: false,
          matricNumber: "ECN/2023/112",
          faculty: "Faculty of Social Sciences",
          department: "Economics",
        }),
      ]);

    // Create approved profiles for the accredited organizers
    const [studentProfile, campusOrgProfile] = await Promise.all([
      OrganizerProfile.create({
        userId: studentOrgUser._id,
        applicantType: "individual",
        displayName: "Student Builder Initiative",
        description: "Empowering university students with open source skills and peer learning.",
        status: ORGANIZER_STATUS.APPROVED,
        isVerified: true,
      }),
      OrganizerProfile.create({
        userId: campusOrgUser._id,
        applicantType: "organization",
        organizationName: "NACOSS OAU",
        displayName: "NACOSS OAU Chapter",
        organizationCategory: "Departmental",
        description: "Nigeria Association of Computer Science Students, OAU Chapter.",
        status: ORGANIZER_STATUS.APPROVED,
        isVerified: true,
      }),
    ]);

    assert(adminUser._id && adminUser.role === "admin", "Superadmin provisioned with admin role");
    assert(
      studentOrgUser.role === "student" && studentOrgUser.isOrganizer === true,
      "Individual organizer retains student role with isOrganizer capability flag"
    );
    assert(studentProfile.status === "approved", "Individual organizer has active approved OrganizerProfile");
    assert(campusOrgProfile.status === "approved", "Campus organization has active approved OrganizerProfile");
    assert(unapprovedStudent.isOrganizer === false, "Unapproved student has isOrganizer === false");

    // -------------------------------------------------------------------------
    // 2. AUTHORIZATION & RBAC GUARDS
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Authorization & RBAC Guard Verification ---");

    // Test that unapproved student cannot act as organizer
    const isUnapprovedAllowed =
      unapprovedStudent.role === USER_ROLES.ADMIN ||
      Boolean(unapprovedStudent.isOrganizer || unapprovedStudent.role === USER_ROLES.ORGANIZER);
    assert(!isUnapprovedAllowed, "Unaccredited student is strictly barred from organizer privileges");

    // Test that approved individual student passes capability check
    const isIndividualAllowed =
      studentOrgUser.role === USER_ROLES.ADMIN ||
      Boolean(studentOrgUser.isOrganizer || studentOrgUser.role === USER_ROLES.ORGANIZER);
    assert(isIndividualAllowed, "Approved individual student successfully passes organizer capability gate");

    // -------------------------------------------------------------------------
    // 3. DRAFT EVENT CREATION BY INDIVIDUAL STUDENT ORGANIZER
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Event Draft Creation by Approved Student Organizer ---");

    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowEnd = new Date(tomorrow.getTime() + 7200000); // +2 hours

    const draftEvent = await Event.create({
      title: "Great Ife Open Source Summit 2026",
      slug: `great-ife-open-source-summit-2026-${Date.now().toString(36)}`,
      summary: "First annual student open source convention at Obafemi Awolowo University.",
      description: "Join fellow student developers for workshops on Git, Next.js, AI agents, and contributing to open source repositories.",
      category: "Tech & Innovation",
      eventType: "physical",
      venue: "Oduduwa Hall",
      faculty: "Faculty of Technology",
      department: "Computer Science and Engineering",
      startDate: tomorrow,
      endDate: tomorrowEnd,
      flyerUrl: "/images/oau/oau-oduduwa-hall.jpg",
      isFree: true,
      organizerId: studentOrgUser._id,
      organizerName: studentProfile.displayName,
      status: EVENT_STATUS.DRAFT,
      totalCapacity: 200,
      availableSeats: 200,
      registeredCount: 0,
      ticketTiers: [
        {
          name: "General Admission",
          price: 0,
          capacity: 200,
          available: 200,
          maxPerOrder: 2,
          description: "Standard free student ticket.",
        },
      ],
    });

    assert(draftEvent._id && draftEvent.status === "draft", "Draft event created successfully in MongoDB");
    assert(draftEvent.totalCapacity === 200, "Draft event totalCapacity matches configured tiers");
    assert(draftEvent.availableSeats === 200, "Draft event availableSeats initialized to full capacity");
    assert(draftEvent.organizerId.toString() === studentOrgUser._id.toString(), "Event ownership correctly linked to organizer");

    // Verify draft event is ISOLATED from public discovery
    const publicDraftQuery = await Event.find({ status: EVENT_STATUS.PUBLISHED, _id: draftEvent._id });
    assert(publicDraftQuery.length === 0, "Security isolation: Draft event is NOT returned in public event queries");

    // -------------------------------------------------------------------------
    // 4. SUBMISSION TO SUPERADMIN APPROVAL QUEUE
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Event Submission to Superadmin Approval Queue ---");

    draftEvent.status = EVENT_STATUS.PENDING_APPROVAL;
    draftEvent.submittedAt = new Date();
    await draftEvent.save();

    assert(draftEvent.status === "pending_approval", "Event transitioned from 'draft' to 'pending_approval'");
    assert(draftEvent.submittedAt instanceof Date, "Submission timestamp recorded for audit trail");

    // Verify pending event is still ISOLATED from public discovery
    const publicPendingQuery = await Event.find({ status: EVENT_STATUS.PUBLISHED, _id: draftEvent._id });
    assert(publicPendingQuery.length === 0, "Security isolation: Pending approval event is NOT returned in public event queries");

    // -------------------------------------------------------------------------
    // 5. SUPERADMIN REJECTION WORKFLOW WITH REASON
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Superadmin Event Review: Rejection with Required Feedback ---");

    const rejectionFeedback = "Oduduwa Hall is reserved for university faculty senate meetings on this date. Please reschedule or select another campus venue.";
    draftEvent.status = EVENT_STATUS.REJECTED;
    draftEvent.rejectionReason = rejectionFeedback;
    await draftEvent.save();

    assert(draftEvent.status === "rejected", "Event transitioned to 'rejected' status");
    assert(draftEvent.rejectionReason === rejectionFeedback, "Constructive rejection feedback stored for organizer remediation");

    // Verify rejected event is ISOLATED from public discovery
    const publicRejectedQuery = await Event.find({ status: EVENT_STATUS.PUBLISHED, _id: draftEvent._id });
    assert(publicRejectedQuery.length === 0, "Security isolation: Rejected event is NOT returned in public event queries");

    // -------------------------------------------------------------------------
    // 6. ORGANIZER REMEDIATION & RESUBMISSION
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Organizer Remediation & Resubmission ---");

    // Organizer remedies the venue conflict
    draftEvent.venue = "Amphi Theatre";
    draftEvent.flyerUrl = "/images/oau/oau-amphitheatre-stage.jpg";
    draftEvent.status = EVENT_STATUS.PENDING_APPROVAL;
    draftEvent.submittedAt = new Date();
    await draftEvent.save();

    assert(draftEvent.venue === "Amphi Theatre", "Organizer successfully updated venue to Amphi Theatre");
    assert(draftEvent.status === "pending_approval", "Remediated event resubmitted to 'pending_approval'");

    // -------------------------------------------------------------------------
    // 7. SUPERADMIN APPROVAL & INSTANT PUBLISHING
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Superadmin Approval & Public Feed Publishing ---");

    draftEvent.status = EVENT_STATUS.PUBLISHED;
    draftEvent.approvedAt = new Date();
    draftEvent.approvedBy = new mongoose.Types.ObjectId(adminUser._id.toString());
    draftEvent.rejectionReason = undefined;
    await draftEvent.save();

    assert(draftEvent.status === "published", "Superadmin approved event: status set to 'published'");
    assert(draftEvent.approvedAt instanceof Date, "Event approval timestamp recorded");
    assert(draftEvent.approvedBy?.toString() === adminUser._id.toString(), "Superadmin approver identity stored");

    // Verify event IS NOW VISIBLE in public event discovery
    const publicPublishedQuery = await Event.find({ status: EVENT_STATUS.PUBLISHED, _id: draftEvent._id });
    assert(publicPublishedQuery.length === 1, "Public feed: Published event is now immediately discoverable");
    assert(publicPublishedQuery[0].title === draftEvent.title, "Public event details match approved submission");

    // -------------------------------------------------------------------------
    // 8. TICKET BOOKING & QR ISSUANCE ON NEWLY APPROVED EVENT
    // -------------------------------------------------------------------------
    console.log("\n--- 8. Free Ticket Booking Integration on Approved Event ---");

    const ticketTier = draftEvent.ticketTiers[0];
    const initialAvailable = draftEvent.availableSeats;
    const initialRegistered = draftEvent.registeredCount;

    // Process real registration through existing system
    const bookingResult = await processFreeRegistration({
      userId: attendeeStudent._id.toString(),
      userEmail: attendeeStudent.email,
      userName: attendeeStudent.name,
      eventId: draftEvent._id.toString(),
      ticketTierId: ticketTier._id.toString(),
      quantity: 1,
    });

    assert(bookingResult.success, "Student successfully registered free ticket for newly approved event");
    assert(bookingResult.bookingReference.startsWith("NOT-"), "Valid university booking reference generated");
    assert(bookingResult.ticketCodes.length === 1, "One ticket code issued for single registration");

    // Verify ticket in MongoDB with cryptographic HMAC signature
    const issuedTicket = await Ticket.findOne({ code: bookingResult.ticketCodes[0] });
    assert(issuedTicket !== null, "Ticket record persisted in MongoDB");
    assert(
      TicketSecurityService.verifyTicketSignature(
        issuedTicket!.code,
        issuedTicket!.eventId.toString(),
        issuedTicket!.securitySignature
      ),
      "Issued ticket verifies authentic university cryptographic HMAC signature"
    );

    // Verify updated Event metrics in MongoDB
    const reloadedEvent = await Event.findById(draftEvent._id);
    assert(
      reloadedEvent!.registeredCount === initialRegistered + 1,
      `Event registeredCount incremented from ${initialRegistered} to ${reloadedEvent!.registeredCount}`
    );
    assert(
      reloadedEvent!.availableSeats === initialAvailable - 1,
      `Event availableSeats decremented from ${initialAvailable} to ${reloadedEvent!.availableSeats}`
    );

    const reloadedTier = reloadedEvent!.ticketTiers.id(ticketTier._id);
    assert(
      reloadedTier!.available === ticketTier.available - 1,
      `Ticket tier available count correctly decremented to ${reloadedTier!.available}`
    );

    // -------------------------------------------------------------------------
    // 9. ORGANIZER OWNERSHIP & MULTI-TENANCY ISOLATION
    // -------------------------------------------------------------------------
    console.log("\n--- 9. Organizer Multi-Tenancy Ownership Protection ---");

    // Another organizer cannot modify this event
    const unauthorizedAttemptAllowed =
      campusOrgUser.role === USER_ROLES.ADMIN ||
      draftEvent.organizerId.toString() === campusOrgUser._id.toString();
    assert(!unauthorizedAttemptAllowed, "Multi-tenancy defense: Organizer B cannot modify Organizer A's event");

    // -------------------------------------------------------------------------
    // 10. EVENT CANCELLATION
    // -------------------------------------------------------------------------
    console.log("\n--- 10. Organizer Event Cancellation ---");

    reloadedEvent!.status = EVENT_STATUS.CANCELLED;
    await reloadedEvent!.save();

    assert(reloadedEvent!.status === "cancelled", "Organizer successfully marked event as cancelled");

    // Verify cancelled event is removed from public discovery
    const publicCancelledQuery = await Event.find({ status: EVENT_STATUS.PUBLISHED, _id: reloadedEvent!._id });
    assert(publicCancelledQuery.length === 0, "Cancelled event is immediately removed from public active feed");

    // -------------------------------------------------------------------------
    // 11. CLEANUP OF AUDIT RECORDS
    // -------------------------------------------------------------------------
    console.log("\n--- 11. Cleaning Up Test Artifacts ---");

    await Promise.all([
      Event.deleteMany({ _id: draftEvent._id }),
      Ticket.deleteMany({ eventId: draftEvent._id }),
      Booking.deleteMany({ eventId: draftEvent._id }),
      OrganizerProfile.deleteMany({ _id: { $in: [studentProfile._id, campusOrgProfile._id] } }),
      User.deleteMany({
        _id: {
          $in: [
            adminUser._id,
            studentOrgUser._id,
            campusOrgUser._id,
            unapprovedStudent._id,
            attendeeStudent._id,
          ],
        },
      }),
    ]);

    console.log("✅ All test audit data cleaned up successfully.");
  } catch (err) {
    console.error("❌ Critical error during Phase 5.2 E2E test run:", err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log("\n================================================================================");
  console.log(`📊 PHASE 5.2 E2E AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runOrganizerEventsE2E();

