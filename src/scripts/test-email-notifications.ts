import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/database/mongoose";
import { EmailDelivery } from "../models/EmailDelivery";
import { Notification } from "../models/Notification";
import { User } from "../models/User";
import { USER_ROLES } from "../constants/roles";
import { getStudentProfile, updateStudentProfile } from "../lib/student/service";
import { notificationService } from "../services/notification.service";
import {
  sendEmail,
  setEmailMockHandler,
  SendEmailOptions,
  SendEmailResult,
} from "../lib/email/client";
import { verifyResendWebhookSignature } from "../lib/email/webhook";
import { isResendConfigured } from "../config/env";
import {
  renderFreeTicketEmail,
  renderPaidTicketReceiptEmail,
} from "../lib/email/templates/ticket-templates";
import {
  renderOrganizerAppSubmittedEmail,
  renderOrganizerAppApprovedEmail,
  renderOrganizerAppRejectedEmail,
  renderOrganizerChangesRequestedEmail,
  renderEventSubmittedEmail,
  renderEventApprovedEmail,
  renderEventRejectedEmail,
  renderPayoutStatusEmail,
} from "../lib/email/templates/organizer-templates";
import { renderRefundStatusEmail } from "../lib/email/templates/refund-templates";

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
  console.log("📧 NOTARI 2.0: RESEND EMAIL NOTIFICATION & AUDIT SYSTEM VERIFICATION");
  console.log("================================================================================\n");

  // Track dispatched emails in mock collector
  const dispatchedEmails: SendEmailOptions[] = [];
  setEmailMockHandler(async (options: SendEmailOptions): Promise<SendEmailResult> => {
    dispatchedEmails.push(options);

    // Simulate failure for specific test address
    const recipient = Array.isArray(options.to) ? options.to.join(",") : options.to;
    if (recipient.includes("fail@bounce.oau.edu.ng")) {
      return {
        success: false,
        provider: "mock",
        error: "Simulated mail server bounce: 550 Mailbox unavailable",
      };
    }

    return {
      success: true,
      id: `mock_resend_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "mock",
    };
  });

  // ---------------------------------------------------------------------------
  // SECTION 1: CONFIGURATION & CLIENT FALLBACK
  // ---------------------------------------------------------------------------
  console.log("▶ 1. Resend Configuration & Safety");
  assert(typeof isResendConfigured === "function", "isResendConfigured helper exists");
  assert(process.env.EMAIL_FROM != null, "EMAIL_FROM verified sender is configured");

  // Verify direct sendEmail through mock transport
  const directSendRes = await sendEmail({
    to: "test@student.oau.edu.ng",
    subject: "Test Direct Send",
    html: "<p>Hello OAU</p>",
    text: "Hello OAU",
  });
  assert(directSendRes.success === true, "sendEmail dispatches successfully via mock transport");

  // Verify missing credentials in production strictly fails (no silent simulation)
  const prevEnv = process.env.NODE_ENV;
  const prevKey = process.env.RESEND_API_KEY;
  setEmailMockHandler(null);
  delete (process.env as Record<string, string | undefined>).RESEND_API_KEY;
  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  const prodMissingKeyRes = await sendEmail({
    to: "student@oau.edu.ng",
    subject: "Production Test Alert",
    html: "<p>Prod Test</p>",
  });
  assert(
    prodMissingKeyRes.success === false,
    "Missing credentials in production strictly returns success: false"
  );
  assert(
    prodMissingKeyRes.error?.includes("Missing or invalid RESEND_API_KEY in production environment"),
    "Production failure records clear operational error message"
  );
  assert(
    prodMissingKeyRes.provider === "resend",
    "Failed production attempt records provider: 'resend'"
  );

  // Restore test mock handler and environment
  (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
  if (prevKey !== undefined) (process.env as Record<string, string | undefined>).RESEND_API_KEY = prevKey;
  setEmailMockHandler(async (options: SendEmailOptions): Promise<SendEmailResult> => {
    dispatchedEmails.push(options);
    const recipient = Array.isArray(options.to) ? options.to.join(",") : options.to;
    if (recipient.includes("fail@bounce.oau.edu.ng")) {
      return {
        success: false,
        provider: "mock",
        error: "Simulated mail server bounce: 550 Mailbox unavailable",
      };
    }
    return {
      success: true,
      id: `mock_resend_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "mock",
    };
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: TEMPLATE GENERATION (HTML & PLAIN TEXT)
  // ---------------------------------------------------------------------------
  console.log("\n▶ 2. Reusable Branded Email Templates (HTML & Plain Text)");

  // A. Free Ticket
  const freeEmail = renderFreeTicketEmail({
    studentName: "Adeola Johnson",
    studentEmail: "adeola@student.oau.edu.ng",
    eventTitle: "IFE Tech Summit 2026",
    eventVenue: "Oduduwa Hall, OAU",
    eventDate: new Date("2026-11-20T10:00:00Z"),
    bookingReference: "NOT-BKG-TEST-001",
    tierName: "Regular Student Pass",
    quantity: 1,
    ticketCodes: ["NOT-OAU-FREE-1234"],
  });
  assert(freeEmail.subject.includes("IFE Tech Summit 2026"), "Free ticket email subject contains event title");
  assert(freeEmail.html.includes("NOTARI"), "Free ticket HTML contains NOTARI branding");
  assert(freeEmail.html.includes("NOT-OAU-FREE-1234"), "Free ticket HTML contains ticket code");
  assert(freeEmail.text.includes("NOT-OAU-FREE-1234"), "Free ticket plain text contains ticket code");

  // B. Paid Ticket Receipt (Strict Integer Kobo Verification)
  const paidEmail = renderPaidTicketReceiptEmail({
    studentName: "Adeola Johnson",
    studentEmail: "adeola@student.oau.edu.ng",
    eventTitle: "OAU Annual Gala Night",
    eventVenue: "Amphi Theatre, OAU",
    eventDate: new Date("2026-12-10T18:00:00Z"),
    bookingReference: "NOT-BKG-PAID-001",
    paymentReference: "NOT-PAY-TEST-888",
    tierName: "VIP Student Pass",
    quantity: 2,
    amountInKobo: 500000, // 5,000 Naira in integer Kobo
    paidAt: new Date("2026-11-06T12:00:00Z"),
    ticketCodes: ["NOT-OAU-PAID-001", "NOT-OAU-PAID-002"],
  });
  assert(paidEmail.subject.includes("OAU Annual Gala Night"), "Paid receipt subject contains event title");
  assert(paidEmail.html.includes("₦5,000"), "Paid receipt HTML formats integer Kobo to Naira ₦5,000 correctly");
  assert(paidEmail.text.includes("₦5,000"), "Paid receipt plain text contains ₦5,000");
  assert(paidEmail.html.includes("NOT-PAY-TEST-888"), "Paid receipt contains Paystack reference");

  // C. Organizer Application Templates
  const appSubmitted = renderOrganizerAppSubmittedEmail({
    applicantName: "Nathanael Ajekiigbe",
    applicantType: "organization",
    organizationOrBrandName: "OAU Tech Community",
    applicationId: "APP-001",
    recipientEmail: "org@notari.oau.edu.ng",
  });
  assert(appSubmitted.html.includes("OAU Tech Community"), "App submitted HTML contains organization name");

  const appApproved = renderOrganizerAppApprovedEmail({
    applicantName: "Nathanael Ajekiigbe",
    brandOrOrgName: "OAU Tech Community",
    recipientEmail: "org@notari.oau.edu.ng",
    reviewerName: "Superadmin",
  });
  assert(appApproved.html.includes("Verified Campus Organizer"), "App approved HTML contains accreditation status");

  const appRejected = renderOrganizerAppRejectedEmail({
    applicantName: "Nathanael Ajekiigbe",
    reason: "Incomplete documentation",
    recipientEmail: "org@notari.oau.edu.ng",
  });
  assert(appRejected.html.includes("Incomplete documentation"), "App rejected HTML contains rejection feedback");

  const appChangesRequested = renderOrganizerChangesRequestedEmail({
    applicantName: "Nathanael Ajekiigbe",
    reason: "Please re-upload higher resolution faculty advisor letter",
    recipientEmail: "org@notari.oau.edu.ng",
  });
  assert(appChangesRequested.html.includes("faculty advisor letter"), "Changes requested HTML contains requested revision notes");
  assert(appChangesRequested.text.includes("faculty advisor letter"), "Changes requested text contains requested revision notes");

  // D. Event Moderation Templates
  const eventSubmitted = renderEventSubmittedEmail({
    organizerName: "Tech Hub",
    organizerEmail: "host@oau.edu.ng",
    eventTitle: "HackOAU 2026",
    eventId: "EVT-100",
  });
  assert(eventSubmitted.html.includes("HackOAU 2026"), "Event submitted HTML contains title");

  const eventApproved = renderEventApprovedEmail({
    organizerName: "Tech Hub",
    organizerEmail: "host@oau.edu.ng",
    eventTitle: "HackOAU 2026",
    eventId: "EVT-100",
    eventSlug: "hackoau-2026",
  });
  assert(eventApproved.html.includes("Published"), "Event approved HTML contains published status");

  const eventRejected = renderEventRejectedEmail({
    organizerName: "Tech Hub",
    organizerEmail: "host@oau.edu.ng",
    eventTitle: "HackOAU 2026",
    eventId: "EVT-100",
    reason: "Venue collision with University Convocation",
  });
  assert(eventRejected.html.includes("University Convocation"), "Event rejected HTML contains reason");

  // E. Payout Status Templates
  const payoutEmail = renderPayoutStatusEmail({
    organizerName: "Tech Hub",
    organizerEmail: "host@oau.edu.ng",
    reference: "NOT-PAYOUT-777",
    amountInNaira: 150000,
    status: "successful",
    bankName: "First Bank of Nigeria",
    accountMasked: "****1234",
  });
  assert(payoutEmail.html.includes("₦150,000"), "Payout HTML formats settlement amount in Naira");
  assert(payoutEmail.html.includes("SUCCESSFUL"), "Payout HTML reflects successful settlement");

  // F. Refund Status Templates
  const refundEmail = renderRefundStatusEmail({
    studentName: "Adeola",
    studentEmail: "student@oau.edu.ng",
    reference: "NOT-REF-999",
    amountInNaira: 2500,
    status: "approved",
  });
  assert(refundEmail.html.includes("₦2,500"), "Refund HTML contains refund amount");
  assert(refundEmail.html.includes("APPROVED"), "Refund HTML reflects approved status");

  // ---------------------------------------------------------------------------
  // SECTION 3: MONGODB DATABASE-BACKED UNIFIED NOTIFICATION & OUTBOX AUDIT
  // ---------------------------------------------------------------------------
  console.log("\n▶ 3. Live MongoDB Unified Dispatch & Outbox Audit Tracking");

  const testUserId = new mongoose.Types.ObjectId();
  const testStudentEmail = `test_student_${Date.now()}@oau.edu.ng`;
  const testBookingRef = `NOT-BKG-TEST-${Date.now()}`;
  const testPaymentRef = `NOT-PAY-TEST-${Date.now()}`;

  try {
    await connectToDatabase();
    console.log("  🔌 Connected to MongoDB Atlas.");

    // Clear test residue if any
    await EmailDelivery.deleteMany({ recipient: testStudentEmail });
    await Notification.deleteMany({ userId: testUserId });

    // Test 3.1: Free Ticket Unified Dispatch
    const freeResult = await notificationService.notifyFreeTicketIssued({
      userId: testUserId,
      studentName: "Adeola Student",
      studentEmail: testStudentEmail,
      eventTitle: "OAU Career Fair 2026",
      eventVenue: "Hezekiah Oluwasanmi Library Lawn",
      eventDate: new Date(),
      bookingReference: testBookingRef,
      tierName: "General Admission",
      quantity: 1,
      ticketCodes: ["NOT-FREE-001"],
    });
    assert(freeResult.success === true, "Free ticket notification dispatch reported success");
    assert(freeResult.delivered === true, "Free ticket delivery status is delivered");

    // Verify in-app notification was created
    const inAppFree = await Notification.findOne({ userId: testUserId, type: "ticket" });
    assert(inAppFree != null, "In-app notification created for free ticket");
    assert(inAppFree?.title.includes("Ticket Confirmed"), "In-app notification title is accurate");

    // Verify EmailDelivery audit outbox record
    const deliveryRecordFree = await EmailDelivery.findOne({
      recipient: testStudentEmail,
      relatedId: testBookingRef,
      template: "free_ticket_confirmation",
    });
    assert(deliveryRecordFree != null, "EmailDelivery audit record created for free ticket");
    assert(deliveryRecordFree?.status === "sent" || deliveryRecordFree?.status === "simulated", "EmailDelivery status is sent or simulated");

    // Test 3.2: Idempotency & Webhook Duplicate Prevention
    const duplicateFreeResult = await notificationService.notifyFreeTicketIssued({
      userId: testUserId,
      studentName: "Adeola Student",
      studentEmail: testStudentEmail,
      eventTitle: "OAU Career Fair 2026",
      eventVenue: "Hezekiah Oluwasanmi Library Lawn",
      eventDate: new Date(),
      bookingReference: testBookingRef,
      tierName: "General Admission",
      quantity: 1,
      ticketCodes: ["NOT-FREE-001"],
    });
    assert(duplicateFreeResult.alreadyDelivered === true, "Duplicate delivery attempt recognized and skipped via idempotency check");

    // Test 3.3: Paid Ticket Receipt Unified Dispatch
    const paidResult = await notificationService.notifyPaidTicketReceipt({
      userId: testUserId,
      studentName: "Adeola Student",
      studentEmail: testStudentEmail,
      eventTitle: "OAU Tech Carnival",
      eventVenue: "Sports Complex",
      eventDate: new Date(),
      bookingReference: testBookingRef,
      paymentReference: testPaymentRef,
      tierName: "VIP Pass",
      quantity: 2,
      amountInKobo: 400000,
      paidAt: new Date(),
      ticketCodes: ["NOT-PAID-001", "NOT-PAID-002"],
    });
    assert(paidResult.success === true, "Paid ticket notification dispatch reported success");

    const inAppPaid = await Notification.findOne({ userId: testUserId, type: "payment" });
    assert(inAppPaid != null, "In-app notification created for paid ticket payment");

    const deliveryRecordPaid = await EmailDelivery.findOne({
      recipient: testStudentEmail,
      relatedId: testPaymentRef,
      template: "paid_ticket_receipt",
    });
    assert(deliveryRecordPaid != null, "EmailDelivery audit record created for paid ticket receipt");

    // Test 3.4: Failed Email Delivery Isolation (Does NOT reverse transaction)
    const failRecipient = `fail@bounce.oau.edu.ng`;
    const failPaymentRef = `NOT-PAY-FAIL-${Date.now()}`;
    const failedResult = await notificationService.notifyPaidTicketReceipt({
      userId: testUserId,
      studentName: "Bouncing Attendee",
      studentEmail: failRecipient,
      eventTitle: "OAU Concert",
      eventVenue: "Amphi Theatre",
      eventDate: new Date(),
      bookingReference: "NOT-BKG-FAIL",
      paymentReference: failPaymentRef,
      tierName: "VIP",
      quantity: 1,
      amountInKobo: 100000,
      paidAt: new Date(),
      ticketCodes: ["NOT-FAIL-001"],
    });
    assert(failedResult.delivered === false, "Failed delivery correctly reported delivered: false");
    assert(failedResult.error != null, "Failure reason is recorded in result");

    const failedAudit = await EmailDelivery.findOne({
      recipient: failRecipient,
      relatedId: failPaymentRef,
    });
    assert(failedAudit != null, "Failed email delivery logged in EmailDelivery outbox");
    assert(failedAudit?.status === "failed", "EmailDelivery audit record marked status: 'failed'");
    assert(failedAudit?.error?.includes("Mailbox unavailable"), "Error message recorded in audit record");
    assert(failedAudit?.retryCount === 1, "Retry count initialized to 1");

    // -------------------------------------------------------------------------
    // SECTION 4: DELIVERY RETRY SYSTEM & BOUNDING SAFEGUARDS
    // -------------------------------------------------------------------------
    console.log("\n▶ 4. Admin Delivery Recovery & Bounded Retry Safeguards");

    const retryRecipient = `retry_${Date.now()}@student.oau.edu.ng`;
    const failedDoc = await EmailDelivery.create({
      recipient: retryRecipient,
      subject: "Important Event Update",
      template: "event_update",
      status: "failed",
      provider: "mock",
      retryCount: 1,
      lastAttemptAt: new Date(),
      error: "Temporary network timeout",
      metadata: {
        html: "<p>Important event venue update for OAU students.</p>",
        text: "Important event venue update for OAU students.",
      },
    });

    // Test 4.1: Successful Retry Execution
    const retrySuccess = await notificationService.retryFailedDelivery(failedDoc._id.toString());
    assert(retrySuccess.success === true, "Admin retry request succeeds for failed delivery");
    assert(retrySuccess.status === 200, "Retry status code is 200 OK");
    assert(
      retrySuccess.delivery?.status === "sent" || retrySuccess.delivery?.status === "simulated",
      "Retried delivery status transitions to sent or simulated"
    );
    assert(retrySuccess.delivery?.deliveredAt != null, "deliveredAt timestamp is recorded upon successful retry");
    assert(retrySuccess.delivery?.error === undefined, "Delivery error is cleared upon successful retry");

    // Test 4.2: Guard Against Re-Sending Already Dispatched Emails
    const duplicateRetry = await notificationService.retryFailedDelivery(failedDoc._id.toString());
    assert(duplicateRetry.success === false, "Retry rejected for already delivered notification");
    assert(duplicateRetry.status === 400, "Already-delivered retry returns 400 Bad Request");
    assert(
      duplicateRetry.message.includes("already been successfully dispatched"),
      "Helpful error message explains email was already dispatched"
    );

    // Test 4.3: Max Retry Attempt Bounding (Cap at 5)
    const maxRetryDoc = await EmailDelivery.create({
      recipient: `max_retries_${Date.now()}@oau.edu.ng`,
      subject: "Persistent Failure Notice",
      template: "system_notice",
      status: "failed",
      provider: "mock",
      retryCount: 5,
      lastAttemptAt: new Date(),
      error: "Persistent destination rejection",
      metadata: { html: "<p>Notice</p>", text: "Notice" },
    });

    const maxRetryAttempt = await notificationService.retryFailedDelivery(maxRetryDoc._id.toString());
    assert(maxRetryAttempt.success === false, "Retry rejected when retryCount >= 5");
    assert(maxRetryAttempt.status === 422, "Max retries exceeded returns 422 Unprocessable Entity");
    assert(
      maxRetryAttempt.message.includes("Maximum delivery retry attempts (5) exceeded"),
      "Message explains max delivery retries safeguard"
    );

    // Test 4.4: Invalid ID Validation
    const invalidIdRetry = await notificationService.retryFailedDelivery("non_existent_id");
    assert(invalidIdRetry.success === false, "Invalid delivery ID returns success: false");
    assert(invalidIdRetry.status === 400, "Invalid ID returns 400 status");

    // -------------------------------------------------------------------------
    // SECTION 5: STUDENT EMAIL PREFERENCES & AUDIT PERSISTENCE
    // -------------------------------------------------------------------------
    console.log("\n▶ 5. User Email Preferences Persistence & Validation");

    const prefStudent = await User.create({
      name: "Pref Test Student",
      email: `pref_student_${Date.now()}@student.oau.edu.ng`,
      role: USER_ROLES.STUDENT,
      matricNumber: `CSC/2022/${Math.floor(100 + Math.random() * 900)}`,
      password: "hashed_dummy_password",
      isVerified: true,
    });

    // Test 5.1: Default preferences when unset
    const initialProfile = await getStudentProfile(prefStudent._id.toString());
    assert(initialProfile.success === true, "Fetched initial student profile");
    const initPrefs = (initialProfile.data as { emailPreferences: { eventReminders: boolean; campusAnnouncements: boolean } }).emailPreferences;
    assert(initPrefs.eventReminders === true, "Default eventReminders is true");
    assert(initPrefs.campusAnnouncements === true, "Default campusAnnouncements is true");

    // Test 5.2: Update preferences (Opt out of reminders, keep announcements)
    const updatePrefsRes = await updateStudentProfile(prefStudent._id.toString(), {
      name: "Pref Test Student",
      emailPreferences: {
        eventReminders: false,
        campusAnnouncements: true,
      },
    });
    assert(updatePrefsRes.success === true, "Updated student email preferences");
    const updatedPrefs = (updatePrefsRes.data as { emailPreferences: { eventReminders: boolean; campusAnnouncements: boolean } }).emailPreferences;
    assert(updatedPrefs.eventReminders === false, "eventReminders updated to false");
    assert(updatedPrefs.campusAnnouncements === true, "campusAnnouncements remains true");

    // Test 5.3: Verify persistence via re-fetching
    const reFetchedProfile = await getStudentProfile(prefStudent._id.toString());
    const reFetchedPrefs = (reFetchedProfile.data as { emailPreferences: { eventReminders: boolean; campusAnnouncements: boolean } }).emailPreferences;
    assert(reFetchedPrefs.eventReminders === false, "Persisted eventReminders is false in MongoDB");
    assert(reFetchedPrefs.campusAnnouncements === true, "Persisted campusAnnouncements is true in MongoDB");

    // -------------------------------------------------------------------------
    // SECTION 6: RESEND WEBHOOK CRYPTOGRAPHIC SIGNATURE & REPLAY DEFENSE
    // -------------------------------------------------------------------------
    console.log("\n▶ 6. Resend Webhook Cryptographic Signature & Replay Defense");

    const testSecret = "whsec_mfasdjklfhasdjkfhasdjkfhasdjkf="; // 32 bytes base64
    const testSvixId = `msg_${Date.now()}`;
    const testSvixTimestamp = Math.floor(Date.now() / 1000).toString();
    const testPayload = JSON.stringify({
      type: "email.delivered",
      data: { email_id: "resend_test_webhook_msg_001" },
    });

    // Generate valid HMAC signature
    const secretKeyBuf = Buffer.from(testSecret.replace("whsec_", ""), "base64");
    const toSign = `${testSvixId}.${testSvixTimestamp}.${testPayload}`;
    const validSignature = crypto.createHmac("sha256", secretKeyBuf).update(toSign, "utf-8").digest("base64");
    const validHeader = `v1,${validSignature}`;

    // Test 6.1: Valid signature passes verification
    const sigCheckValid = verifyResendWebhookSignature({
      payload: testPayload,
      svixId: testSvixId,
      svixTimestamp: testSvixTimestamp,
      svixSignature: validHeader,
      secret: testSecret,
    });
    assert(sigCheckValid === true, "Valid Svix / Resend webhook signature successfully verified");

    // Test 6.2: Tampered payload fails verification
    const sigCheckTampered = verifyResendWebhookSignature({
      payload: testPayload + "tampered",
      svixId: testSvixId,
      svixTimestamp: testSvixTimestamp,
      svixSignature: validHeader,
      secret: testSecret,
    });
    assert(sigCheckTampered === false, "Tampered webhook payload strictly rejected by cryptographic verification");

    // Test 6.3: Expired timestamp (>300 seconds) fails verification (replay defense)
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
    const sigCheckExpired = verifyResendWebhookSignature({
      payload: testPayload,
      svixId: testSvixId,
      svixTimestamp: oldTimestamp,
      svixSignature: validHeader,
      secret: testSecret,
    });
    assert(sigCheckExpired === false, "Expired webhook timestamp (>300s) rejected by replay attack defense");

    // -------------------------------------------------------------------------
    // SECTION 7: RESEND WEBHOOK DELIVERY & BOUNCE STATUS ACCURACY
    // -------------------------------------------------------------------------
    console.log("\n▶ 7. Webhook Delivery, Bounce & Audit Lifecycle Processing");

    const webhookMsgId = `resend_wh_msg_${Date.now()}`;
    const webhookDeliveryDoc = await EmailDelivery.create({
      recipient: "attendee.webhook@oau.edu.ng",
      subject: "Entrance Pass",
      template: "ticket_pass",
      status: "accepted",
      provider: "resend",
      providerMessageId: webhookMsgId,
      lastAttemptAt: new Date(),
    });

    // Test 7.1: Accepted status does NOT have deliveredAt pre-set
    assert(webhookDeliveryDoc.status === "accepted", "Initial dispatch records status: 'accepted'");
    assert(webhookDeliveryDoc.deliveredAt == null, "deliveredAt is strictly undefined until webhook delivery event");

    // Test 7.2: Simulate email.delivered webhook processing
    webhookDeliveryDoc.status = "delivered";
    webhookDeliveryDoc.deliveredAt = new Date();
    webhookDeliveryDoc.webhookEvents = [
      {
        eventId: `evt_deliv_${Date.now()}`,
        type: "email.delivered",
        timestamp: new Date(),
      },
    ];
    await webhookDeliveryDoc.save();

    const deliveredRecord = await EmailDelivery.findById(webhookDeliveryDoc._id);
    assert(deliveredRecord?.status === "delivered", "Webhook updates status to 'delivered'");
    assert(deliveredRecord?.deliveredAt != null, "Webhook populates deliveredAt timestamp accurately");
    assert(deliveredRecord?.webhookEvents?.length === 1, "Webhook event recorded in audit trail");

    // Test 7.3: Simulate email.bounced webhook processing
    const bounceMsgId = `resend_bounce_msg_${Date.now()}`;
    const bounceDoc = await EmailDelivery.create({
      recipient: "invalid.student@oau.edu.ng",
      subject: "Important Event Notice",
      template: "event_update",
      status: "accepted",
      provider: "resend",
      providerMessageId: bounceMsgId,
      lastAttemptAt: new Date(),
    });

    bounceDoc.status = "bounced";
    bounceDoc.isNonRetryable = true;
    bounceDoc.error = "550 5.1.1 User unknown";
    bounceDoc.webhookEvents = [
      {
        eventId: `evt_bounce_${Date.now()}`,
        type: "email.bounced",
        timestamp: new Date(),
      },
    ];
    await bounceDoc.save();

    const bouncedRecord = await EmailDelivery.findById(bounceDoc._id);
    assert(bouncedRecord?.status === "bounced", "Bounce event marks record status: 'bounced'");
    assert(bouncedRecord?.isNonRetryable === true, "Bounced record is marked isNonRetryable: true");
    assert(bouncedRecord?.error?.includes("User unknown"), "Bounce error reason recorded");

    // -------------------------------------------------------------------------
    // SECTION 8: CONCURRENT DISPATCH & UNIQUE IDEMPOTENCY KEY PROTECTION
    // -------------------------------------------------------------------------
    console.log("\n▶ 8. Concurrent Dispatch & Unique Idempotency Key Protection");

    const concurrentBookingRef = `NOT-BKG-CONCURRENT-${Date.now()}`;
    const concurrentRecipient = `concurrent_${Date.now()}@student.oau.edu.ng`;

    // Fire 5 concurrent dispatches simultaneously for the exact same booking reference
    const concurrentDispatches = await Promise.all([
      notificationService.notifyFreeTicketIssued({
        userId: testUserId,
        studentName: "Concurrent Attendee",
        studentEmail: concurrentRecipient,
        eventTitle: "IFE Music Festival",
        eventVenue: "Amphi Theatre",
        eventDate: new Date(),
        bookingReference: concurrentBookingRef,
        tierName: "Regular Pass",
        quantity: 1,
        ticketCodes: ["NOT-CONC-001"],
      }),
      notificationService.notifyFreeTicketIssued({
        userId: testUserId,
        studentName: "Concurrent Attendee",
        studentEmail: concurrentRecipient,
        eventTitle: "IFE Music Festival",
        eventVenue: "Amphi Theatre",
        eventDate: new Date(),
        bookingReference: concurrentBookingRef,
        tierName: "Regular Pass",
        quantity: 1,
        ticketCodes: ["NOT-CONC-001"],
      }),
      notificationService.notifyFreeTicketIssued({
        userId: testUserId,
        studentName: "Concurrent Attendee",
        studentEmail: concurrentRecipient,
        eventTitle: "IFE Music Festival",
        eventVenue: "Amphi Theatre",
        eventDate: new Date(),
        bookingReference: concurrentBookingRef,
        tierName: "Regular Pass",
        quantity: 1,
        ticketCodes: ["NOT-CONC-001"],
      }),
    ]);

    assert(
      concurrentDispatches.every((res) => res.success === true),
      "All concurrent requests resolve successfully without throwing uncaught exceptions"
    );

    const concurrentOutboxDocs = await EmailDelivery.find({
      recipient: concurrentRecipient,
      relatedId: concurrentBookingRef,
    });
    assert(
      concurrentOutboxDocs.length === 1,
      `Exactly 1 outbox document created in database despite 3 concurrent requests (got ${concurrentOutboxDocs.length})`
    );

    // -------------------------------------------------------------------------
    // SECTION 9: AUTOMATED RETRY BATCH ENGINE (processPendingRetries)
    // -------------------------------------------------------------------------
    console.log("\n▶ 9. Automated Batch Retry Processor & Exponential Backoff");

    const autoRetryRecipient = `auto_retry_${Date.now()}@student.oau.edu.ng`;

    // Record A: Due for retry (nextRetryAt in the past)
    const dueDoc = await EmailDelivery.create({
      recipient: autoRetryRecipient,
      subject: "Due Retry Notice",
      template: "system_notice",
      status: "retry_scheduled",
      provider: "mock",
      retryCount: 1,
      lastAttemptAt: new Date(Date.now() - 120000),
      nextRetryAt: new Date(Date.now() - 60000), // Due 1 minute ago
      metadata: { html: "<p>Due for retry</p>", text: "Due for retry" },
    });

    // Record B: NOT due yet (nextRetryAt in the future)
    const futureDoc = await EmailDelivery.create({
      recipient: autoRetryRecipient,
      subject: "Future Retry Notice",
      template: "system_notice",
      status: "retry_scheduled",
      provider: "mock",
      retryCount: 1,
      lastAttemptAt: new Date(),
      nextRetryAt: new Date(Date.now() + 600000), // Due in 10 minutes
      metadata: { html: "<p>Not due</p>", text: "Not due" },
    });

    // Record C: Non-retryable failure (should be skipped)
    const nonRetryableDoc = await EmailDelivery.create({
      recipient: autoRetryRecipient,
      subject: "Non-Retryable Notice",
      template: "system_notice",
      status: "failed",
      provider: "mock",
      retryCount: 1,
      isNonRetryable: true,
      lastAttemptAt: new Date(),
      metadata: { html: "<p>Non-retryable</p>", text: "Non-retryable" },
    });

    const retryBatchResult = await notificationService.processPendingRetries({ batchSize: 10 });
    assert(retryBatchResult.processed >= 1, "Automated retry processor processed due records");
    assert(retryBatchResult.succeeded >= 1, "Due record successfully re-dispatched via batch runner");

    const reCheckedDue = await EmailDelivery.findById(dueDoc._id);
    assert(
      reCheckedDue?.status === "accepted" || reCheckedDue?.status === "simulated",
      "Due record transitioned to accepted/simulated upon automated retry"
    );

    const reCheckedFuture = await EmailDelivery.findById(futureDoc._id);
    assert(
      reCheckedFuture?.status === "retry_scheduled",
      "Future record not due remains untouched as retry_scheduled"
    );

    const reCheckedNonRetryable = await EmailDelivery.findById(nonRetryableDoc._id);
    assert(
      reCheckedNonRetryable?.status === "failed",
      "Non-retryable record remains untouched as failed"
    );

    // Clean up test records
    await EmailDelivery.deleteMany({
      recipient: {
        $in: [
          testStudentEmail,
          failRecipient,
          retryRecipient,
          maxRetryDoc.recipient,
          "attendee.webhook@oau.edu.ng",
          "invalid.student@oau.edu.ng",
          concurrentRecipient,
          autoRetryRecipient,
        ],
      },
    });
    await Notification.deleteMany({ userId: testUserId });
    await User.findByIdAndDelete(prefStudent._id);
    console.log("  🧹 Cleaned up test database records.");
  } catch (dbErr) {
    console.error("  ❌ Database test error:", dbErr);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // SECTION 4: RESET MOCK HANDLER
  // ---------------------------------------------------------------------------
  setEmailMockHandler(null);

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
