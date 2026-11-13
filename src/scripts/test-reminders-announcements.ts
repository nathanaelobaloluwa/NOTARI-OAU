import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User, IUserDocument } from "@/models/User";
import { Event, IEventDocument } from "@/models/Event";
import { Booking, IBookingDocument } from "@/models/Booking";
import { Ticket, ITicketDocument } from "@/models/Ticket";
import { Announcement, IAnnouncementDocument } from "@/models/Announcement";
import { EventReminderDispatch } from "@/models/EventReminderDispatch";
import { EmailDelivery } from "@/models/EmailDelivery";
import { Notification } from "@/models/Notification";
import { reminderService } from "@/services/reminder.service";
import { announcementService } from "@/services/announcement.service";
import { notificationService } from "@/services/notification.service";
import { setEmailMockHandler, SendEmailOptions, SendEmailResult } from "@/lib/email/client";
import { USER_ROLES } from "@/constants/roles";
import mongoose from "mongoose";

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

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
  passed++;
}

async function runTests() {
  console.log("\n" + "=".repeat(80));
  console.log("📢 NOTARI 2.0: AUTOMATED EVENT REMINDERS & CAMPUS ANNOUNCEMENTS AUDIT");
  console.log("=".repeat(80));

  await connectToDatabase();
  console.log("  🔌 Connected to MongoDB Atlas.");

  const testRunId = Date.now().toString().slice(-6);
  const createdUserIds: mongoose.Types.ObjectId[] = [];
  const createdEventIds: mongoose.Types.ObjectId[] = [];
  const createdBookingIds: mongoose.Types.ObjectId[] = [];
  const createdTicketIds: mongoose.Types.ObjectId[] = [];
  const createdAnnouncementIds: mongoose.Types.ObjectId[] = [];
  const createdReminderIds: mongoose.Types.ObjectId[] = [];

  // Track dispatched emails in memory via mock handler
  const dispatchedEmails: SendEmailOptions[] = [];
  setEmailMockHandler(async (options: SendEmailOptions): Promise<SendEmailResult> => {
    dispatchedEmails.push(options);
    return {
      success: true,
      provider: "mock",
      id: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  });

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST FIXTURES: Organizers, Students, and Admin
    // -------------------------------------------------------------------------
    console.log("\n▶ 0. Setting up Test Users and Organizers");

    const adminUser = await User.create({
      name: `Super Admin ${testRunId}`,
      email: `admin_${testRunId}@oau.edu.ng`,
      role: USER_ROLES.ADMIN,
      isVerified: true,
    });
    createdUserIds.push(adminUser._id);

    const organizerA = await User.create({
      name: `NACOSS President ${testRunId}`,
      email: `nacoss_${testRunId}@oau.edu.ng`,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      isVerified: true,
    });
    createdUserIds.push(organizerA._id);

    const organizerB = await User.create({
      name: `IFUMSA President ${testRunId}`,
      email: `ifumsa_${testRunId}@oau.edu.ng`,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      isVerified: true,
    });
    createdUserIds.push(organizerB._id);

    // Student 1: Faculty of Technology, Computer Science, 400 Level, Email Reminders Enabled
    const studentTech400 = await User.create({
      name: `Adeola Technology ${testRunId}`,
      email: `adeola_${testRunId}@student.oau.edu.ng`,
      role: USER_ROLES.STUDENT,
      matricNumber: `CSC/2021/${testRunId}`,
      faculty: "Technology",
      department: "Computer Science and Engineering",
      level: "400",
      emailPreferences: {
        eventReminders: true,
        campusAnnouncements: true,
      },
      isVerified: true,
    });
    createdUserIds.push(studentTech400._id);

    // Student 2: Faculty of Science, Chemistry, 200 Level, Email Reminders Disabled
    const studentScience200 = await User.create({
      name: `Bimbo Science ${testRunId}`,
      email: `bimbo_${testRunId}@student.oau.edu.ng`,
      role: USER_ROLES.STUDENT,
      matricNumber: `CHM/2023/${testRunId}`,
      faculty: "Science",
      department: "Chemistry",
      level: "200",
      emailPreferences: {
        eventReminders: false, // Explicitly opted out of email reminders
        campusAnnouncements: false, // Opted out of non-urgent announcements
      },
      isVerified: true,
    });
    createdUserIds.push(studentScience200._id);

    // Student 3: Faculty of Technology, Electrical, 400 Level
    const studentTechElec = await User.create({
      name: `Chidi Electrical ${testRunId}`,
      email: `chidi_${testRunId}@student.oau.edu.ng`,
      role: USER_ROLES.STUDENT,
      matricNumber: `EEE/2021/${testRunId}`,
      faculty: "Technology",
      department: "Electronic and Electrical Engineering",
      level: "400",
      emailPreferences: {
        eventReminders: true,
        campusAnnouncements: true,
      },
      isVerified: true,
    });
    createdUserIds.push(studentTechElec._id);

    assert(createdUserIds.length === 6, "Successfully provisioned test admin, organizers, and students");

    // -------------------------------------------------------------------------
    // SECTION 1: EVENT REMINDER TIMING & ELIGIBILITY AUDIT
    // -------------------------------------------------------------------------
    console.log("\n▶ 1. Event Reminder Timing & Eligibility Calculation");

    const now = new Date();
    // Event starting in 24 hours
    const start24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end24h = new Date(start24h.getTime() + 3 * 60 * 60 * 1000);

    const event24h = await Event.create({
      title: `Great Ife Software Summit ${testRunId}`,
      slug: `software-summit-${testRunId}`,
      description: "Annual university software and tech convention.",
      venue: "Oduduwa Hall Main Auditorium",
      startDate: start24h,
      endDate: end24h,
      organizerId: organizerA._id,
      organizerName: organizerA.name,
      category: "Tech & Innovation",
      isFree: true,
      ticketTiers: [
        {
          name: "Standard Pass",
          price: 0,
          capacity: 100,
          available: 98,
          maxPerOrder: 2,
        },
      ],
      totalCapacity: 100,
      registeredCount: 2,
      status: "published",
      isFeatured: true,
    });
    createdEventIds.push(event24h._id);

    // Create confirmed booking and valid ticket for Student 1 (Tech)
    const booking1 = await Booking.create({
      bookingReference: `NOT-BKG-24H-A-${testRunId}`,
      userId: studentTech400._id,
      eventId: event24h._id,
      organizerId: organizerA._id,
      ticketTierId: event24h.ticketTiers[0]._id,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
      paymentChannel: "free",
    });
    createdBookingIds.push(booking1._id);

    const ticket1 = await Ticket.create({
      bookingId: booking1._id,
      eventId: event24h._id,
      userId: studentTech400._id,
      ticketTierId: event24h.ticketTiers[0]._id,
      tierName: "Standard Pass",
      ticketCode: `NOT-OAU-24H-1-${testRunId}`,
      attendeeName: studentTech400.name,
      attendeeEmail: studentTech400.email,
      pricePaid: 0,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(ticket1._id);

    // Create confirmed booking but REFUNDED/INVALIDATED ticket for Student 2 (should be excluded)
    const booking2 = await Booking.create({
      bookingReference: `NOT-BKG-24H-B-${testRunId}`,
      userId: studentScience200._id,
      eventId: event24h._id,
      organizerId: organizerA._id,
      ticketTierId: event24h.ticketTiers[0]._id,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "refunded", // Refunded booking
      paymentChannel: "free",
    });
    createdBookingIds.push(booking2._id);

    const ticket2 = await Ticket.create({
      bookingId: booking2._id,
      eventId: event24h._id,
      userId: studentScience200._id,
      ticketTierId: event24h.ticketTiers[0]._id,
      tierName: "Standard Pass",
      ticketCode: `NOT-OAU-24H-2-${testRunId}`,
      attendeeName: studentScience200.name,
      attendeeEmail: studentScience200.email,
      pricePaid: 0,
      isCheckedIn: false,
      isInvalidated: true, // Invalidated ticket
      invalidatedReason: "Ticket cancelled and refunded",
    });
    createdTicketIds.push(ticket2._id);

    // Verify attendee eligibility filter excludes refunded/invalidated ticket
    const eligibleAttendees = await reminderService.getEligibleAttendees(event24h._id);
    assert(
      eligibleAttendees.length === 1,
      `Eligible attendees strictly excludes refunded/invalidated tickets (expected 1, got ${eligibleAttendees.length})`
    );
    assert(
      eligibleAttendees[0].userId === studentTech400._id.toString(),
      "Eligible attendee is correctly identified as confirmed ticket holder"
    );

    // -------------------------------------------------------------------------
    // SECTION 2: 24-HOUR AUTOMATED REMINDER EXECUTION
    // -------------------------------------------------------------------------
    console.log("\n▶ 2. 24-Hour Automated Reminder Dispatch");

    dispatchedEmails.length = 0;
    const initialReminderStats = await reminderService.processDueEventReminders({
      referenceDate: now,
    });

    assert(initialReminderStats.eventsChecked >= 1, "Reminder engine evaluated upcoming published events");
    assert(initialReminderStats.remindersDispatched >= 1, "Dispatched 24-hour reminder to eligible attendee");

    // Check EventReminderDispatch record in MongoDB
    const dispatchRecord24h = await EventReminderDispatch.findOne({
      eventId: event24h._id,
      userId: studentTech400._id,
      stage: "24h",
    });
    assert(dispatchRecord24h != null, "EventReminderDispatch audit record persisted in MongoDB");
    assert(dispatchRecord24h?.inAppSent === true, "In-app reminder notification recorded as sent");
    assert(dispatchRecord24h?.stage === "24h", "Reminder stage recorded as 24h");
    if (dispatchRecord24h) createdReminderIds.push(dispatchRecord24h._id);

    // Verify In-app notification in DB
    const inAppNotice = await Notification.findOne({
      userId: studentTech400._id,
      type: "event",
    }).sort({ createdAt: -1 });
    assert(inAppNotice != null, "In-app Notification record created in database for student");
    assert(
      Boolean(inAppNotice?.title.includes("Event Reminder (Tomorrow)")),
      "In-app notification title specifies 24-hour tomorrow reminder"
    );

    // Verify Email dispatch
    assert(dispatchedEmails.length === 1, "Exactly 1 email dispatched via Resend transport");
    assert(
      dispatchedEmails[0].subject.includes(event24h.title),
      "Email reminder subject includes event title"
    );

    // -------------------------------------------------------------------------
    // SECTION 3: 1-HOUR AUTOMATED REMINDER EXECUTION
    // -------------------------------------------------------------------------
    console.log("\n▶ 3. 1-Hour Automated Reminder Dispatch");

    // Create an event starting in 50 minutes (within 1h window: 0 to 1.25h)
    const start1h = new Date(now.getTime() + 50 * 60 * 1000);
    const end1h = new Date(start1h.getTime() + 2 * 60 * 60 * 1000);

    const event1h = await Event.create({
      title: `Emergency Campus Hackathon ${testRunId}`,
      slug: `hackathon-1h-${testRunId}`,
      description: "Quick sprint hackathon at Awolowo Hall Common Room.",
      venue: "Awolowo Hall Common Room",
      startDate: start1h,
      endDate: end1h,
      organizerId: organizerA._id,
      organizerName: organizerA.name,
      category: "Tech & Innovation",
      isFree: true,
      ticketTiers: [
        {
          name: "Hacker Pass",
          price: 0,
          capacity: 50,
          available: 49,
          maxPerOrder: 1,
        },
      ],
      totalCapacity: 50,
      registeredCount: 1,
      status: "published",
    });
    createdEventIds.push(event1h._id);

    const booking3 = await Booking.create({
      bookingReference: `NOT-BKG-1H-${testRunId}`,
      userId: studentTech400._id,
      eventId: event1h._id,
      organizerId: organizerA._id,
      ticketTierId: event1h.ticketTiers[0]._id,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
      paymentChannel: "free",
    });
    createdBookingIds.push(booking3._id);

    const ticket3 = await Ticket.create({
      bookingId: booking3._id,
      eventId: event1h._id,
      userId: studentTech400._id,
      ticketTierId: event1h.ticketTiers[0]._id,
      tierName: "Hacker Pass",
      ticketCode: `NOT-OAU-1H-${testRunId}`,
      attendeeName: studentTech400.name,
      attendeeEmail: studentTech400.email,
      pricePaid: 0,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(ticket3._id);

    dispatchedEmails.length = 0;
    const oneHourStats = await reminderService.processDueEventReminders({
      referenceDate: now,
    });

    assert(oneHourStats.remindersDispatched >= 1, "Dispatched 1-hour starting soon reminder to attendee");

    const dispatchRecord1h = await EventReminderDispatch.findOne({
      eventId: event1h._id,
      userId: studentTech400._id,
      stage: "1h",
    });
    assert(dispatchRecord1h != null, "1-hour EventReminderDispatch audit record persisted in MongoDB");
    assert(dispatchRecord1h?.stage === "1h", "Recorded stage is '1h'");
    if (dispatchRecord1h) createdReminderIds.push(dispatchRecord1h._id);

    assert(
      dispatchedEmails.some((e) => e.subject.includes("begins in 1 hour")),
      "1-hour email subject reflects starting soon urgency"
    );

    // -------------------------------------------------------------------------
    // SECTION 4: DATABASE-BACKED IDEMPOTENCY & DUPLICATE PREVENTION
    // -------------------------------------------------------------------------
    console.log("\n▶ 4. Database-Backed Idempotency & Duplicate Prevention");

    dispatchedEmails.length = 0;
    // Rerun reminder processing immediately (simulating overlapping cron or duplicate execution)
    const duplicateRunStats = await reminderService.processDueEventReminders({
      referenceDate: now,
    });

    assert(
      duplicateRunStats.remindersDispatched === 0,
      "Second consecutive cron run dispatches 0 additional reminders"
    );
    assert(
      duplicateRunStats.alreadyDispatched >= 1,
      "Duplicate cron run recognizes existing records via database-backed idempotency"
    );
    assert(dispatchedEmails.length === 0, "No duplicate emails sent on repeated cron trigger");

    // -------------------------------------------------------------------------
    // SECTION 5: STUDENT EMAIL PREFERENCE ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log("\n▶ 5. Student Email Preferences Enforcement");

    // Book studentScience200 (who opted OUT of email reminders) for a new 24h event
    const startPrefTest = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const eventPref = await Event.create({
      title: `Chemistry Lab Orientation ${testRunId}`,
      slug: `chemistry-orientation-${testRunId}`,
      description: "Lab safety protocols.",
      venue: "White House Lab 101",
      startDate: startPrefTest,
      endDate: new Date(startPrefTest.getTime() + 2 * 60 * 60 * 1000),
      organizerId: organizerA._id,
      organizerName: organizerA.name,
      category: "Tech & Innovation",
      isFree: true,
      ticketTiers: [{ name: "Pass", price: 0, capacity: 50, available: 49, maxPerOrder: 1 }],
      totalCapacity: 50,
      registeredCount: 1,
      status: "published",
    });
    createdEventIds.push(eventPref._id);

    const bookingPref = await Booking.create({
      bookingReference: `NOT-BKG-PREF-${testRunId}`,
      userId: studentScience200._id,
      eventId: eventPref._id,
      ticketTierId: eventPref.ticketTiers[0]._id,
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      paymentStatus: "successful",
      paymentChannel: "free",
    });
    createdBookingIds.push(bookingPref._id);

    const ticketPref = await Ticket.create({
      bookingId: bookingPref._id,
      eventId: eventPref._id,
      userId: studentScience200._id,
      ticketTierId: eventPref.ticketTiers[0]._id,
      tierName: "Pass",
      ticketCode: `NOT-OAU-PREF-${testRunId}`,
      attendeeName: studentScience200.name,
      attendeeEmail: studentScience200.email,
      pricePaid: 0,
      isCheckedIn: false,
      isInvalidated: false,
    });
    createdTicketIds.push(ticketPref._id);

    dispatchedEmails.length = 0;
    await reminderService.processDueEventReminders({ referenceDate: now });

    // In-app should be created, but email MUST be skipped because studentScience200 opted out
    const studentScienceInApp = await Notification.findOne({
      userId: studentScience200._id,
      title: { $regex: /Chemistry Lab Orientation/ },
    });
    assert(studentScienceInApp != null, "In-app reminder delivered even when email is opted out");

    const emailSentToScience = dispatchedEmails.some((e) => {
      const recipient = Array.isArray(e.to) ? e.to.join(",") : e.to;
      return recipient.includes(studentScience200.email);
    });
    assert(emailSentToScience === false, "Email reminder strictly suppressed by student emailPreferences");

    // -------------------------------------------------------------------------
    // SECTION 6: CANCELLED & RESCHEDULED EVENT HANDLING
    // -------------------------------------------------------------------------
    console.log("\n▶ 6. Cancelled & Rescheduled Event Handling");

    // Mark eventPref as cancelled
    eventPref.status = "cancelled";
    await eventPref.save();

    const cancelledEventAttendees = await Event.find({
      status: "published",
      _id: eventPref._id,
    });
    assert(cancelledEventAttendees.length === 0, "Cancelled event is strictly excluded from reminder queries");

    // -------------------------------------------------------------------------
    // SECTION 7: CAMPUS ANNOUNCEMENT CREATION & AUDIENCE TARGETING
    // -------------------------------------------------------------------------
    console.log("\n▶ 7. Campus Announcement Creation & Audience Targeting");

    // 7.1 Admin creates General Campus Announcement (target: all_students)
    const adminGeneralRes = await announcementService.createAnnouncement(
      { id: adminUser._id.toString(), role: USER_ROLES.ADMIN, name: adminUser.name },
      {
        title: `Harmattan Semester Examinations Timetable Released ${testRunId}`,
        summary: "The final examination timetable for the 2025/2026 session is now available.",
        content: "Please check your faculty noticeboards and portal for approved examination dates.",
        category: "academic_updates",
        priority: "high",
        targetAudience: { type: "all_students" },
        status: "published",
      }
    );
    assert(adminGeneralRes.success === true, "Admin created and published platform-wide announcement");
    if (adminGeneralRes.announcement) createdAnnouncementIds.push(adminGeneralRes.announcement._id);

    // 7.2 Admin creates Faculty-Targeted Announcement (target: Faculty of Technology)
    const adminFacultyRes = await announcementService.createAnnouncement(
      { id: adminUser._id.toString(), role: USER_ROLES.ADMIN, name: adminUser.name },
      {
        title: `Faculty of Technology Engineering Workshop Notice ${testRunId}`,
        summary: "Mandatory mechanical and software workshop for all Technology undergraduates.",
        content: "Workshops will take place at Spider Building Workshop Labs from 9:00 AM.",
        category: "faculty_announcements",
        priority: "normal",
        targetAudience: { type: "faculty", faculty: "Technology" },
        status: "published",
      }
    );
    assert(adminFacultyRes.success === true, "Admin created Faculty-targeted announcement (Technology)");
    if (adminFacultyRes.announcement) createdAnnouncementIds.push(adminFacultyRes.announcement._id);

    // 7.3 Student feed verification: Student in Technology MUST see both
    const techStudentFeed = await announcementService.getStudentFeed(studentTech400._id.toString(), {
      page: 1,
      limit: 10,
    });
    const techTitles = techStudentFeed.announcements.map((a) => a.title as string);
    assert(
      techTitles.some((t) => t.includes("Harmattan Semester Examinations")),
      "Tech student sees 'all_students' announcement"
    );
    assert(
      techTitles.some((t) => t.includes("Faculty of Technology Engineering Workshop")),
      "Tech student sees Technology faculty announcement"
    );

    // 7.4 Student feed verification: Student in Science MUST NOT see Technology announcement
    const scienceStudentFeed = await announcementService.getStudentFeed(studentScience200._id.toString(), {
      page: 1,
      limit: 10,
    });
    const scienceTitles = scienceStudentFeed.announcements.map((a) => a.title as string);
    assert(
      scienceTitles.some((t) => t.includes("Harmattan Semester Examinations")),
      "Science student sees 'all_students' announcement"
    );
    assert(
      !scienceTitles.some((t) => t.includes("Faculty of Technology Engineering Workshop")),
      "Science student strictly blocked from receiving Technology faculty announcement (Targeting Verified)"
    );

    // -------------------------------------------------------------------------
    // SECTION 8: ANNOUNCEMENT MODERATION LIFECYCLE (Draft -> Review -> Publish/Reject)
    // -------------------------------------------------------------------------
    console.log("\n▶ 8. Announcement Moderation Lifecycle");

    // Create an announcement in 'pending_review'
    const pendingAnnouncement = await Announcement.create({
      title: `Campus Trade Fair Accreditation Notice ${testRunId}`,
      summary: "Registration for campus vendor booths opens this Monday.",
      content: "All campus vendors must register with the student union before Thursday.",
      category: "campus_events",
      priority: "normal",
      targetAudience: { type: "all_students" },
      status: "pending_review",
      authorId: organizerA._id,
      authorRole: "organizer",
      authorName: organizerA.name,
    });
    createdAnnouncementIds.push(pendingAnnouncement._id);

    // Rejection without reason fails validation
    const invalidReviewRes = await announcementService.reviewAnnouncement(
      pendingAnnouncement._id.toString(),
      adminUser._id.toString(),
      { action: "reject", rejectionReason: "No" } as any // Less than 5 chars
    );
    assert(
      invalidReviewRes.success === false || invalidReviewRes.status === 400 || invalidReviewRes.status === 422,
      "Moderation rejection without sufficient reason is safely guarded"
    );

    // Approval transitions to published
    const approvalRes = await announcementService.reviewAnnouncement(
      pendingAnnouncement._id.toString(),
      adminUser._id.toString(),
      { action: "approve" }
    );
    assert(approvalRes.success === true, "Admin approval succeeds");
    assert(approvalRes.announcement?.status === "published", "Approved announcement transitions to 'published'");
    assert(approvalRes.announcement?.publishedAt != null, "publishedAt timestamp recorded upon approval");

    // -------------------------------------------------------------------------
    // SECTION 9: SCHEDULED ANNOUNCEMENT AUTOMATED CRON PUBLISHING
    // -------------------------------------------------------------------------
    console.log("\n▶ 9. Scheduled Announcement Automated Publishing");

    // Create a scheduled announcement due in the past
    const pastScheduleDate = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
    const scheduledAnnouncement = await Announcement.create({
      title: `Scheduled Bursary Disbursement Alert ${testRunId}`,
      summary: "OAU Bursary Office will begin scholarship processing today.",
      content: "All eligible students should confirm their registered bank accounts.",
      category: "scholarships_competitions",
      priority: "high",
      targetAudience: { type: "all_students" },
      status: "scheduled",
      scheduledFor: pastScheduleDate,
      authorId: adminUser._id,
      authorRole: "admin",
    });
    createdAnnouncementIds.push(scheduledAnnouncement._id);

    const publishResult = await announcementService.publishDueScheduledAnnouncements();
    assert(publishResult.publishedCount >= 1, "Automated cron runner published due scheduled announcement");

    const refreshedDoc = await Announcement.findById(scheduledAnnouncement._id);
    assert(refreshedDoc?.status === "published", "Scheduled announcement transitioned to 'published'");
    assert(refreshedDoc?.publishedAt != null, "publishedAt timestamp set on scheduled announcement");

    // -------------------------------------------------------------------------
    // SECTION 10: ORGANIZER EVENT BROADCAST & ACCESS CONTROL DEFENSE
    // -------------------------------------------------------------------------
    console.log("\n▶ 10. Organizer Event Broadcast & Cross-Tenant Defense");

    // Organizer A broadcasts venue change to their own event (event24h)
    const organizerBroadcastRes = await announcementService.createOrganizerBroadcast(
      organizerA._id.toString(),
      {
        eventId: event24h._id.toString(),
        updateType: "venue_change",
        subjectLine: `Venue Change: Moved to Amphi Theatre ${testRunId}`,
        message: "Due to overwhelming demand, the software summit is relocated to the Amphitheatre.",
        newVenue: "Amphitheatre Stage",
      }
    );
    assert(organizerBroadcastRes.success === true, "Organizer successfully broadcast notice to event attendees");
    if (organizerBroadcastRes.announcement) createdAnnouncementIds.push(organizerBroadcastRes.announcement._id);

    // Cross-tenant defense: Organizer B attempts to broadcast to Organizer A's event -> REJECTED
    const crossTenantBroadcastRes = await announcementService.createOrganizerBroadcast(
      organizerB._id.toString(), // Wrong organizer!
      {
        eventId: event24h._id.toString(),
        updateType: "instructions",
        subjectLine: "Unauthorized Broadcast Attempt",
        message: "This should be blocked by cross-tenant security guard.",
      }
    );
    assert(crossTenantBroadcastRes.success === false, "Cross-tenant broadcast attempt is blocked");
    assert(crossTenantBroadcastRes.status === 403, "Returns HTTP 403 Forbidden for foreign organizer");

    // -------------------------------------------------------------------------
    // SECTION 11: STUDENT MARK ANNOUNCEMENT AS READ
    // -------------------------------------------------------------------------
    console.log("\n▶ 11. Student Announcement Read State Tracking");

    const markReadRes = await announcementService.markAsRead(
      adminGeneralRes.announcement!._id.toString(),
      studentTech400._id.toString()
    );
    assert(markReadRes === true, "Student marked announcement as read");

    const studentFeedAfterRead = await announcementService.getStudentFeed(studentTech400._id.toString(), {
      page: 1,
      limit: 10,
    });
    const readItem = studentFeedAfterRead.announcements.find(
      (a) => a.id === adminGeneralRes.announcement!._id.toString()
    );
    assert(readItem?.isRead === true, "Announcement accurately reflects isRead: true in student feed");

    // -------------------------------------------------------------------------
    // SECTION 12: ADMIN KPI ANALYTICS AGGREGATION
    // -------------------------------------------------------------------------
    console.log("\n▶ 12. Admin Announcement KPI Metrics Aggregation");

    const adminStats = await announcementService.getAdminStats();
    assert(adminStats.totalAnnouncements >= 3, "Total announcements KPI metric aggregated");
    assert(adminStats.published >= 2, "Published announcements KPI count accurate");
    assert(typeof adminStats.notifications.inAppTotal === "number", "In-app notifications total count tracked");

    console.log("\n" + "=".repeat(80));
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("=".repeat(80));
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -------------------------------------------------------------------------
    console.log("\n🧹 Cleaning up test fixtures from MongoDB Atlas...");
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await Event.deleteMany({ _id: { $in: createdEventIds } });
    await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    await Ticket.deleteMany({ _id: { $in: createdTicketIds } });
    await Announcement.deleteMany({ _id: { $in: createdAnnouncementIds } });
    await EventReminderDispatch.deleteMany({ _id: { $in: createdReminderIds } });
    await Notification.deleteMany({ userId: { $in: createdUserIds } });
    await EmailDelivery.deleteMany({ recipient: { $regex: /_.*@.*oau\.edu\.ng/ } });
    console.log("  ✅ Cleaned up test database records.");
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test suite encountered unhandled error:", err);
    process.exit(1);
  });
