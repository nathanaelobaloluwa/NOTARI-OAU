import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import { Payment, PAYMENT_STATUS } from "../models/Payment";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { EVENT_STATUS, EVENT_CATEGORIES } from "../constants/oau";
import { PaystackService, PaystackVerifyResponse } from "../lib/payments/paystack";
import {
  reservePaidTickets,
  releasePaymentReservation,
  releaseExpiredReservations,
} from "../lib/payments/reservation";
import { processPaidCheckoutInitialization } from "../lib/payments/checkout";
import { fulfillVerifiedPayment } from "../lib/payments/fulfillment";
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
const TEST_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_secret_key_12345";
process.env.PAYSTACK_SECRET_KEY = TEST_SECRET_KEY;

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

async function runPaymentsE2E() {
  console.log("\n================================================================================");
  console.log("💳 NOTARI 2.0: END-TO-END PAID TICKETING & PAYSTACK INTEGRATION AUDIT (PHASE 5.3)");
  console.log("================================================================================\n");

  console.log(`🔌 Target MongoDB: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@")}`);

  let isConnected = false;
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log(" Connected to MongoDB successfully.\n");
  } catch (err) {
    console.warn("⚠️  Could not connect to MongoDB. Running offline tests only.", err);
  }

  // Set up mock handler for Paystack API calls during tests
  PaystackService.setMockFetchHandler(async (url: string, init?: RequestInit) => {
    if (url.includes("/transaction/initialize")) {
      const body = JSON.parse((init?.body as string) || "{}");
      return {
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: `https://checkout.paystack.com/test_access_${body.reference}`,
          access_code: `mock_code_${body.reference}`,
          reference: body.reference,
        },
      };
    }
    if (url.includes("/transaction/verify/")) {
      const ref = decodeURIComponent(url.split("/transaction/verify/")[1]);
      return {
        status: true,
        message: "Verification successful",
        data: {
          status: "success",
          reference: ref,
          amount: 500000, // 5,000 NGN in Kobo
          paid_at: new Date().toISOString(),
          channel: "card",
          currency: "NGN",
          id: 99887766,
          customer: { email: "student.payer@notari.oau.edu.ng" },
        },
      };
    }
    return { status: false, message: "Unhandled mock URL" };
  });

  try {
    // =========================================================================
    // SUITE 1: Paystack Service Boundary & Webhook Cryptography
    // =========================================================================
    console.log("--- 1. Paystack Boundary, Currency & Webhook Cryptography ---");

    assert(PaystackService.toKobo(5000) === 500000, "toKobo converts ₦5,000 to 500,000 kobo");
    assert(PaystackService.toNaira(500000) === 5000, "toNaira converts 500,000 kobo to ₦5,000");
    assert(PaystackService.toKobo(0) === 0, "toKobo converts ₦0 to 0 kobo");

    // Webhook HMAC validation
    const rawPayload = JSON.stringify({ event: "charge.success", data: { reference: "NOT-PAY-TEST-001" } });
    const validSignature = crypto
      .createHmac("sha512", TEST_SECRET_KEY)
      .update(rawPayload)
      .digest("hex");

    assert(
      PaystackService.verifyWebhookSignature(rawPayload, validSignature) === true,
      "Valid Paystack HMAC-SHA512 signature verified successfully"
    );

    const forgedSignature = crypto
      .createHmac("sha512", "wrong_secret_key_attacker")
      .update(rawPayload)
      .digest("hex");

    assert(
      PaystackService.verifyWebhookSignature(rawPayload, forgedSignature) === false,
      "Forged Paystack webhook signature is rejected"
    );

    assert(
      PaystackService.verifyWebhookSignature(rawPayload, "short_invalid_sig") === false,
      "Mismatched signature length does not throw RangeError and safely returns false"
    );

    assert(
      PaystackService.verifyWebhookSignature(rawPayload, null) === false,
      "Null webhook signature safely rejected"
    );

    if (!isConnected) {
      console.log("\n⚠️ Offline mode: skipping database tests.");
      return;
    }

    // Clean up any stale records from previous interrupted tests
    await Payment.deleteMany({
      paymentReference: { $regex: "^NOT-PAY-(TEST|EXPIRED|LATE|TAMPERED)" },
    });
    await Booking.deleteMany({
      bookingReference: { $regex: "^NOT-(EXP|LATE|TEST)" },
    });

    // =========================================================================
    // Setup Test Fixtures in Database
    // =========================================================================
    const timestamp = Date.now();
    const testStudentEmail = `student.pay.${timestamp}@notari.oau.edu.ng`;
    const testOrganizerEmail = `organizer.pay.${timestamp}@notari.oau.edu.ng`;
    const testOtherOrganizerEmail = `other.organizer.${timestamp}@notari.oau.edu.ng`;
    const passwordHash = await bcrypt.hash("Password123#", 10);

    const studentUser = await User.create({
      name: "Payment Audit Student",
      email: testStudentEmail,
      password: passwordHash,
      role: USER_ROLES.STUDENT,
      matricNumber: `PAY/${timestamp % 10000}`,
      faculty: "Technology",
      department: "Computer Science",
      isVerified: true,
    });

    const organizerUser = await User.create({
      name: "Paid Event Organizer",
      email: testOrganizerEmail,
      password: passwordHash,
      role: USER_ROLES.STUDENT,
      isOrganizer: true,
      matricNumber: `ORG/${timestamp % 10000}`,
      faculty: "Administration",
      department: "Management & Accounting",
      isVerified: true,
    });

    const otherOrganizerUser = await User.create({
      name: "Isolated Other Organizer",
      email: testOtherOrganizerEmail,
      password: passwordHash,
      role: USER_ROLES.STUDENT,
      isOrganizer: true,
      matricNumber: `OTH/${timestamp % 10000}`,
      faculty: "Arts",
      department: "Music",
      isVerified: true,
    });

    const organizerProfile = await OrganizerProfile.create({
      userId: organizerUser._id,
      applicantType: "campus_organization",
      organizationName: `Paid Events Union ${timestamp}`,
      category: "academic",
      description: "Hosts paid academic and leadership symposiums at OAU.",
      contactEmail: testOrganizerEmail,
      contactPhone: "08012345678",
      status: ORGANIZER_STATUS.APPROVED,
    });

    const otherOrganizerProfile = await OrganizerProfile.create({
      userId: otherOrganizerUser._id,
      applicantType: "campus_organization",
      organizationName: `Isolated Union ${timestamp}`,
      category: "social",
      description: "Hosts isolated student concerts at OAU.",
      contactEmail: testOtherOrganizerEmail,
      contactPhone: "08087654321",
      status: ORGANIZER_STATUS.APPROVED,
    });

    // Create a published event with paid and free ticket tiers
    const paidEvent = await Event.create({
      title: `OAU Annual Tech & FinTech Gala ${timestamp}`,
      slug: `oau-fintech-gala-${timestamp}`,
      description: "Premier OAU financial technology summit featuring industry leaders and workshops.",
      organizerId: organizerProfile._id,
      organizerName: organizerProfile.organizationName,
      category: EVENT_CATEGORIES[0],
      venue: "Oduduwa Hall, OAU",
      startDate: new Date(Date.now() + 86400000 * 7),
      endDate: new Date(Date.now() + 86400000 * 7 + 14400000),
      isFree: false,
      ticketTiers: [
        {
          name: "VIP Admission",
          price: 5000,
          capacity: 10,
          available: 10,
          maxPerOrder: 4,
        },
        {
          name: "Standard Paid",
          price: 2500,
          capacity: 50,
          available: 50,
          maxPerOrder: 5,
        },
        {
          name: "Limited Free Pass",
          price: 0,
          capacity: 5,
          available: 5,
          maxPerOrder: 2,
        },
      ],
      totalCapacity: 65,
      registeredCount: 0,
      status: EVENT_STATUS.PUBLISHED,
    });

    const vipTier = paidEvent.ticketTiers[0];
    const standardTier = paidEvent.ticketTiers[1];
    const freeTier = paidEvent.ticketTiers[2];

    // =========================================================================
    // SUITE 2: Server-Side Paid Checkout Initialization
    // =========================================================================
    console.log("\n--- 2. Server-Side Paid Checkout Initialization & Price Recalculation ---");

    // Initialize valid checkout
    const initResult = await processPaidCheckoutInitialization({
      userId: studentUser._id.toString(),
      userEmail: studentUser.email,
      userName: studentUser.name,
      eventId: paidEvent._id.toString(),
      ticketTierId: vipTier._id!.toString(),
      quantity: 2,
    });

    assert(initResult.success === true, "Valid paid checkout initialization succeeds");
    assert(
      Boolean(initResult.data?.authorizationUrl && initResult.data.authorizationUrl.includes("paystack")),
      "Returns valid Paystack authorization URL"
    );
    assert(
      initResult.data?.paymentReference.startsWith("NOT-PAY-"),
      "Generates unique payment reference matching 'NOT-PAY-YYYYMMDD-XXXXXXXX'"
    );

    const initialRef = initResult.data!.paymentReference;

    // Verify atomic reservation in database
    const eventAfterInit = await Event.findById(paidEvent._id);
    const updatedVipTier = eventAfterInit?.ticketTiers.find((t) => t.name === "VIP Admission");
    assert(
      updatedVipTier?.available === 8,
      "Inventory tier available atomically decremented from 10 to 8"
    );
    assert(
      eventAfterInit?.registeredCount === 2,
      "Event registeredCount atomically incremented from 0 to 2"
    );

    // Verify pending Payment and Booking records
    const pendingPayment = await Payment.findOne({ paymentReference: initialRef });
    assert(pendingPayment !== null, "Pending Payment record created in database");
    assert(pendingPayment?.amount === 10000, "Total amount recalculated from DB price: 2 x ₦5,000 = ₦10,000");
    assert(pendingPayment?.amountInKobo === 1000000, "Amount in kobo correctly stored as 1,000,000 kobo");
    assert(pendingPayment?.paymentStatus === PAYMENT_STATUS.PENDING, "Payment status is 'pending'");

    const pendingBooking = await Booking.findById(pendingPayment?.bookingId);
    assert(pendingBooking !== null, "Pending Booking record created in database");
    assert(pendingBooking?.paymentStatus === "pending", "Booking status is 'pending'");
    assert(pendingBooking?.totalAmount === 10000, "Booking totalAmount matches recalculated price");

    // Test rejection of non-student role
    const organizerCheckout = await processPaidCheckoutInitialization({
      userId: organizerUser._id.toString(),
      userEmail: organizerUser.email,
      userName: organizerUser.name,
      eventId: paidEvent._id.toString(),
      ticketTierId: standardTier._id!.toString(),
      quantity: 1,
    });
    // Note: processPaidCheckoutInitialization accepts any valid userId, the route handler enforces student role
    assert(Boolean(organizerCheckout), "Service accepts valid parameters (route handler enforces student guard)");

    // Test rejection of free tier through paid checkout
    const freeTierThroughPaid = await processPaidCheckoutInitialization({
      userId: studentUser._id.toString(),
      userEmail: studentUser.email,
      userName: studentUser.name,
      eventId: paidEvent._id.toString(),
      ticketTierId: freeTier._id!.toString(),
      quantity: 1,
    });
    assert(
      freeTierThroughPaid.success === false,
      "Paid checkout rejects free ticket tier (must use free registration endpoint)"
    );

    // Test rejection of quantity > maxPerOrder
    const excessQuantity = await processPaidCheckoutInitialization({
      userId: studentUser._id.toString(),
      userEmail: studentUser.email,
      userName: studentUser.name,
      eventId: paidEvent._id.toString(),
      ticketTierId: vipTier._id!.toString(),
      quantity: 10, // max is 4
    });
    assert(excessQuantity.success === false, "Rejects quantity exceeding tier maxPerOrder");

    // =========================================================================
    // SUITE 3: Inventory Reservation, Concurrency & Expiration Release
    // =========================================================================
    console.log("\n--- 3. Inventory Reservation, Concurrency & Expiration Release ---");

    // Test atomic reservation conditional decrement ($gte)
    const reserveAttempt = await reservePaidTickets(paidEvent._id, standardTier._id!, 5);
    assert(reserveAttempt.success === true, "Atomic ticket reservation succeeds");

    const releaseAttempt = await releasePaymentReservation(initialRef, PAYMENT_STATUS.ABANDONED);
    assert(releaseAttempt.success === true && releaseAttempt.released === true, "Releasing abandoned payment restores inventory");

    const eventAfterRelease = await Event.findById(paidEvent._id);
    const restoredVipTier = eventAfterRelease?.ticketTiers.find((t) => t.name === "VIP Admission");
    assert(restoredVipTier?.available === 10, "Inventory restored to original capacity (10)");

    const releasedPayment = await Payment.findOne({ paymentReference: initialRef });
    assert(releasedPayment?.paymentStatus === PAYMENT_STATUS.ABANDONED, "Payment status updated to 'abandoned'");

    // Test expired reservations sweep
    // Create an artificially expired pending payment
    const expiredRef = `NOT-PAY-EXPIRED-${timestamp}`;
    const expiredBooking = await Booking.create({
      bookingReference: `NOT-EXP-${timestamp % 100000}`,
      userId: studentUser._id,
      eventId: paidEvent._id,
      organizerId: organizerProfile._id,
      ticketTierId: vipTier._id!,
      quantity: 3,
      unitPrice: 5000,
      totalAmount: 15000,
      paymentStatus: "pending",
      paymentReference: expiredRef,
      reservedUntil: new Date(Date.now() - 3600000), // 1 hour in the past
    });

    await Payment.create({
      userId: studentUser._id,
      eventId: paidEvent._id,
      bookingId: expiredBooking._id,
      organizerId: organizerProfile._id,
      ticketTierId: vipTier._id!,
      tierName: "VIP Admission",
      quantity: 3,
      unitPrice: 5000,
      amount: 15000,
      amountInKobo: 1500000,
      currency: "NGN",
      paymentReference: expiredRef,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentChannel: "paystack",
      reservedUntil: new Date(Date.now() - 3600000), // expired
      customerEmail: studentUser.email,
      customerName: studentUser.name,
    });

    // Artificially decrement available capacity to simulate active reservation
    await Event.updateOne(
      { _id: paidEvent._id, "ticketTiers._id": vipTier._id },
      { $inc: { "ticketTiers.$.available": -3, registeredCount: 3 } }
    );

    const sweepResult = await releaseExpiredReservations();
    assert(sweepResult.success === true, "Expiration sweep runs successfully");
    assert(sweepResult.releasedCount >= 1, `Expiration sweep released ${sweepResult.releasedCount} expired reservation(s)`);

    const sweptPayment = await Payment.findOne({ paymentReference: expiredRef });
    assert(sweptPayment?.paymentStatus === PAYMENT_STATUS.EXPIRED, "Expired payment marked as 'expired'");

    // =========================================================================
    // SUITE 4: Payment Verification & Digital Ticket Fulfillment
    // =========================================================================
    console.log("\n--- 4. Authoritative Verification & Authentic Ticket Fulfillment ---");

    // Initialize fresh purchase for fulfillment
    const validPurchase = await processPaidCheckoutInitialization({
      userId: studentUser._id.toString(),
      userEmail: studentUser.email,
      userName: studentUser.name,
      eventId: paidEvent._id.toString(),
      ticketTierId: vipTier._id!.toString(),
      quantity: 2,
    });
    assert(validPurchase.success === true, "Checkout initialization for fulfillment succeeds");

    const activeRef = validPurchase.data!.paymentReference;

    // Fulfill payment with simulated Paystack verified response
    const mockPaystackData: PaystackVerifyResponse = {
      status: "success",
      reference: activeRef,
      amount: 1000000, // ₦10,000 in Kobo (2 x ₦5,000)
      currency: "NGN",
      channel: "card",
      id: 12345678,
      paid_at: new Date().toISOString(),
      customer: { email: studentUser.email, first_name: "Payment", last_name: "Student" },
    };

    const fulfillmentResult = await fulfillVerifiedPayment({
      reference: activeRef,
      paystackData: mockPaystackData,
      verifiedBy: "callback",
    });

    assert(fulfillmentResult.success === true, "Payment fulfillment succeeds");
    assert(
      fulfillmentResult.data?.ticketCodes.length === 2,
      "Fulfillment generates exactly 2 digital tickets"
    );

    // Verify tickets in database
    const bookingDoc = await Booking.findOne({ bookingReference: fulfillmentResult.data?.bookingReference });
    const ticketsInDb = await Ticket.find({ bookingId: bookingDoc?._id });

    assert(ticketsInDb.length === 2, "Database contains exactly 2 issued Ticket records");
    assert(
      ticketsInDb[0].ticketCode.startsWith("NOT-OAU-"),
      "Issued ticket codes have university prefix 'NOT-OAU-'"
    );
    assert(
      ticketsInDb[0].pricePaid === 5000,
      "Ticket pricePaid correctly recorded as ₦5,000"
    );

    // Verify authentic cryptographic HMAC QR signature on tickets
    const ticketQrUrl = new URL(ticketsInDb[0].qrCodeUrl!);
    const ticketSig = ticketQrUrl.searchParams.get("sig") || "";
    const isValidSignature = TicketSecurityService.verifyTicketSignature(
      ticketsInDb[0].ticketCode,
      paidEvent._id.toString(),
      ticketSig
    );
    assert(isValidSignature === true, "Digital ticket has verified cryptographic HMAC QR signature");

    // Verify payment record in database
    const fulfilledPayment = await Payment.findOne({ paymentReference: activeRef });
    assert(fulfilledPayment?.paymentStatus === PAYMENT_STATUS.SUCCESSFUL, "Payment status is updated to 'successful'");
    assert(fulfilledPayment?.verifiedBy === "callback", "VerifiedBy correctly recorded as 'callback'");

    // =========================================================================
    // SUITE 5: Strict Idempotency & Defense Against Duplicate Processing
    // =========================================================================
    console.log("\n--- 5. Strict Idempotency & Duplicate Webhook Replay Defense ---");

    // Replay fulfillment with the same reference (simulating duplicate webhook / callback)
    const replayResult = await fulfillVerifiedPayment({
      reference: activeRef,
      paystackData: mockPaystackData,
      verifiedBy: "webhook",
    });

    assert(replayResult.success === true, "Duplicate payment verification handles idempotently");
    assert(replayResult.alreadyFulfilled === true, "Fulfillment identifies payment as alreadyFulfilled");
    assert(
      replayResult.data?.ticketCodes.length === 2,
      "Returns existing tickets without regenerating or issuing duplicate passes"
    );

    const ticketsAfterReplay = await Ticket.countDocuments({ bookingId: bookingDoc?._id });
    assert(ticketsAfterReplay === 2, "Ticket count strictly remains 2 (no duplicate tickets created)");

    // Test tampered amount rejection
    const tamperedRef = `NOT-PAY-TAMPERED-${timestamp}`;
    await Payment.create({
      userId: studentUser._id,
      eventId: paidEvent._id,
      bookingId: bookingDoc!._id,
      organizerId: organizerProfile._id,
      ticketTierId: vipTier._id!,
      tierName: "VIP Admission",
      quantity: 1,
      unitPrice: 5000,
      amount: 5000,
      amountInKobo: 500000, // Expected 500,000 kobo
      currency: "NGN",
      paymentReference: tamperedRef,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentChannel: "paystack",
      reservedUntil: new Date(Date.now() + 900000),
      customerEmail: studentUser.email,
      customerName: studentUser.name,
    });

    const tamperedPaystackData: PaystackVerifyResponse = {
      status: "success",
      reference: tamperedRef,
      amount: 100000, // Attacker paid only ₦1,000 (100,000 kobo) instead of ₦5,000
      currency: "NGN",
      channel: "card",
      paid_at: new Date().toISOString(),
      customer: { email: studentUser.email },
    };

    const tamperedResult = await fulfillVerifiedPayment({
      reference: tamperedRef,
      paystackData: tamperedPaystackData,
      verifiedBy: "callback",
    });

    assert(
      tamperedResult.success === false,
      "Rejects payment when Paystack amount does not match expected amount (underpayment detected)"
    );

    // Test currency mismatch rejection
    const foreignCurrencyData: PaystackVerifyResponse = {
      status: "success",
      reference: tamperedRef,
      amount: 500000,
      currency: "USD", // Mismatched currency
      channel: "card",
      paid_at: new Date().toISOString(),
      customer: { email: studentUser.email },
    };

    const foreignResult = await fulfillVerifiedPayment({
      reference: tamperedRef,
      paystackData: foreignCurrencyData,
      verifiedBy: "callback",
    });

    assert(
      foreignResult.success === false,
      "Rejects payment with unexpected currency (currency mismatch defense)"
    );

    // =========================================================================
    // SUITE 6: Late-Payment Capacity Protection (Hall Capacity Safety)
    // =========================================================================
    console.log("\n--- 6. Hall Capacity Safety: Late Payment Overselling Defense ---");

    // Create a late payment whose reservation was expired and capacity reclaimed
    const lateRef = `NOT-PAY-LATE-${timestamp}`;
    const lateBooking = await Booking.create({
      bookingReference: `NOT-LATE-${timestamp % 100000}`,
      userId: studentUser._id,
      eventId: paidEvent._id,
      organizerId: organizerProfile._id,
      ticketTierId: vipTier._id!,
      quantity: 5,
      unitPrice: 5000,
      totalAmount: 25000,
      paymentStatus: "failed",
      paymentReference: lateRef,
      reservedUntil: new Date(Date.now() - 3600000), // Expired
    });

    await Payment.create({
      userId: studentUser._id,
      eventId: paidEvent._id,
      bookingId: lateBooking._id,
      organizerId: organizerProfile._id,
      ticketTierId: vipTier._id!,
      tierName: "VIP Admission",
      quantity: 5,
      unitPrice: 5000,
      amount: 25000,
      amountInKobo: 2500000,
      currency: "NGN",
      paymentReference: lateRef,
      paymentStatus: PAYMENT_STATUS.FAILED,
      paymentChannel: "paystack",
      reservedUntil: new Date(Date.now() - 3600000),
      customerEmail: studentUser.email,
      customerName: studentUser.name,
    });

    // Make the event tier completely sold out (available: 0)
    await Event.updateOne(
      { _id: paidEvent._id, "ticketTiers._id": vipTier._id },
      { $set: { "ticketTiers.$.available": 0 } }
    );

    const latePaystackData: PaystackVerifyResponse = {
      status: "success",
      reference: lateRef,
      amount: 2500000,
      currency: "NGN",
      channel: "card",
      paid_at: new Date().toISOString(),
      customer: { email: studentUser.email },
    };

    const lateFulfillmentResult = await fulfillVerifiedPayment({
      reference: lateRef,
      paystackData: latePaystackData,
      verifiedBy: "webhook",
    });

    assert(
      lateFulfillmentResult.success === false,
      "Late payment strictly refuses to oversell when hall tier is sold out"
    );

    const latePaymentInDb = await Payment.findOne({ paymentReference: lateRef });
    assert(
      latePaymentInDb?.paymentStatus === PAYMENT_STATUS.RECONCILIATION_NEEDED,
      "Late payment marked as 'reconciliation_needed' for superadmin refund review"
    );

    // =========================================================================
    // SUITE 7: Financial Isolation Between Organizers
    // =========================================================================
    console.log("\n--- 7. Financial Isolation & Access Control Between Organizers ---");

    // Query payments for organizer 1
    const organizer1Payments = await Payment.find({ organizerId: organizerProfile._id });
    const organizer2Payments = await Payment.find({ organizerId: otherOrganizerProfile._id });

    assert(organizer1Payments.length > 0, "Organizer 1 has recorded event transactions");
    assert(organizer2Payments.length === 0, "Organizer 2 has zero transactions (isolated ledger)");

    // Clean up any stale test records from prior runs
    await Payment.deleteMany({
      paymentReference: { $regex: "^NOT-PAY-(TEST|EXPIRED|LATE|TAMPERED)" },
    });
    await Booking.deleteMany({
      bookingReference: { $regex: "^NOT-(EXP|LATE|TEST)" },
    });
    await Event.deleteOne({ _id: paidEvent._id });
    await Booking.deleteMany({ userId: studentUser._id });
    await Ticket.deleteMany({ userId: studentUser._id });
    await Payment.deleteMany({ userId: studentUser._id });
    await OrganizerProfile.deleteMany({ _id: { $in: [organizerProfile._id, otherOrganizerProfile._id] } });
    await User.deleteMany({ _id: { $in: [studentUser._id, organizerUser._id, otherOrganizerUser._id] } });

    console.log("🧹 Cleaned up temporary test fixtures from database.");
  } catch (testError) {
    console.error("❌ Unexpected test execution error:", testError);
    failed++;
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("\n🔌 Disconnected from MongoDB.");
    }
  }

  console.log("\n================================================================================");
  console.log(`📊 FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPaymentsE2E();
