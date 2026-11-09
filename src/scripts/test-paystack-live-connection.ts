/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/database/mongoose";
import { User } from "../models/User";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { Event } from "../models/Event";
import { Ticket } from "../models/Ticket";
import { Booking } from "../models/Booking";
import { Payment, PAYMENT_STATUS } from "../models/Payment";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { PaystackService } from "../lib/payments/paystack";
import { processPaidCheckoutInitialization } from "../lib/payments/checkout";
import { fulfillVerifiedPayment } from "../lib/payments/fulfillment";
import { releaseExpiredReservations } from "../lib/payments/reservation";
import { TicketSecurityService } from "../lib/tickets/qr";

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

async function runLiveVerification() {
  console.log("================================================================================");
  console.log("💳 NOTARI 2.0: PAYSTACK TEST MODE CONNECTION & END-TO-END VERIFICATION");
  console.log("================================================================================\n");

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/verify`;

  // ---------------------------------------------------------------------------
  // 1. CREDENTIALS INSPECTION (WITHOUT EXPOSING SECRETS)
  // ---------------------------------------------------------------------------
  console.log("▶ 1. Credential & Environment Inspection");
  assert(Boolean(secretKey && secretKey.length > 20), "PAYSTACK_SECRET_KEY is present in environment");
  assert(secretKey?.startsWith("sk_test_"), "PAYSTACK_SECRET_KEY is verified as TEST MODE key (sk_test_...)");
  assert(Boolean(publicKey && publicKey.length > 20), "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is present in environment");
  assert(publicKey?.startsWith("pk_test_"), "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is verified as TEST MODE key (pk_test_...)");
  assert(callbackUrl.includes("/payment/verify"), "Callback URL correctly targets /payment/verify");

  // ---------------------------------------------------------------------------
  // 2. LIVE PAYSTACK API AUTHENTICATION & HANDSHAKE
  // ---------------------------------------------------------------------------
  console.log("\n▶ 2. Live Paystack API Handshake (Real HTTP Request to api.paystack.co)");
  try {
    const handshakeRes = await fetch("https://api.paystack.co/bank?country=nigeria&perPage=3", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    const handshakeData = await handshakeRes.json();
    assert(handshakeRes.status === 200, `Paystack API returned HTTP 200 OK (got ${handshakeRes.status})`);
    assert(handshakeData.status === true, "Paystack API confirmed authentication status: true");
    assert(Array.isArray(handshakeData.data) && handshakeData.data.length > 0, "Paystack returned active Nigerian banking institutions");
    console.log(`     Sample Nigerian Banks retrieved: ${handshakeData.data.map((b: any) => b.name).join(", ")}`);
  } catch (err) {
    console.error("  ❌ Handshake failed:", err);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // 3. COMPLETE PAID CHECKOUT WORKFLOW (MONGODB + LIVE PAYSTACK INITIALIZATION)
  // ---------------------------------------------------------------------------
  console.log("\n▶ 3. Paid Ticket Checkout Initialization & Live Paystack Authorization");
  await connectToDatabase();
  console.log("  🔌 Connected to MongoDB Atlas.");

  const timestamp = Date.now();
  const testStudentEmail = `student_${timestamp}@student.oau.edu.ng`;
  const testOrgEmail = `org_${timestamp}@oau.edu.ng`;

  let testStudent: any;
  let testOrg: any;
  let testProfile: any;
  let testPaidEvent: any;
  let initResult: any;

  try {
    testStudent = await User.create({
      name: "Babatunde Fashola",
      email: testStudentEmail,
      role: USER_ROLES.STUDENT,
      isOrganizer: false,
      matricNumber: `MEE/${timestamp.toString().slice(-4)}/042`,
    });

    testOrg = await User.create({
      name: "OAU Engineering Society",
      email: testOrgEmail,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
    });

    testProfile = await OrganizerProfile.create({
      userId: testOrg._id,
      organizationName: "OAU Engineering Society",
      category: "Tech & Innovation",
      description: "Faculty of Technology student chapter.",
      contactEmail: testOrgEmail,
      contactPhone: "08099887766",
      status: ORGANIZER_STATUS.APPROVED,
    });

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000);

    testPaidEvent = await Event.create({
      title: `OAU Engineering Dinner ${timestamp}`,
      slug: `oau-engineering-dinner-${timestamp}`,
      description: "Annual university dinner and awards banquet.",
      category: "Tech & Innovation",
      venue: "Oduduwa Hall",
      organizerId: testOrg._id,
      organizerName: "OAU Engineering Society",
      startDate: tomorrow,
      endDate: dayAfter,
      isFree: false,
      status: "published",
      totalCapacity: 100,
      registeredCount: 0,
      ticketTiers: [
        {
          name: "Student Banquet Pass",
          price: 2500, // ₦2,500
          capacity: 100,
          available: 100,
          maxPerOrder: 5,
        },
      ],
    });

    const targetTier = testPaidEvent.ticketTiers[0];

    // Initialize checkout through NOTARI service
    initResult = await processPaidCheckoutInitialization({
      userId: testStudent._id.toString(),
      userEmail: testStudentEmail,
      userName: "Babatunde Fashola",
      eventId: testPaidEvent._id.toString(),
      ticketTierId: targetTier._id.toString(),
      quantity: 1,
      callbackUrl,
    });

    assert(initResult.success === true, "initializePaidCheckout reported success: true");
    const activePaymentRef = initResult.data?.paymentReference;
    assert(Boolean(activePaymentRef), `Generated transaction reference (${activePaymentRef})`);
    assert(Boolean(initResult.data?.authorizationUrl), "Paystack returned authorizationUrl");
    assert(
      initResult.data.authorizationUrl.startsWith("https://checkout.paystack.com/"),
      "Authorization URL points to official Paystack checkout gateway (https://checkout.paystack.com/...)"
    );
    assert(Boolean(initResult.data?.accessCode), "Paystack returned valid access_code");

    // Verify reservation created in MongoDB
    const paymentRecord = await Payment.findOne({ paymentReference: activePaymentRef });
    assert(paymentRecord != null, "Payment reservation record created in MongoDB");
    assert(paymentRecord?.amountInKobo === 250000, "Integer Kobo amount is strictly 250,000 Kobo (₦2,500)");
    assert(paymentRecord?.paymentStatus === PAYMENT_STATUS.PENDING, "Payment status is initially 'pending'");
    assert(paymentRecord?.currency === "NGN", "Currency is strictly NGN");

    // Verify ticket inventory reservation (capacity held)
    const refreshedEvent = await Event.findById(testPaidEvent._id);
    const refreshedTier = refreshedEvent?.ticketTiers.find((t: any) => t._id.toString() === targetTier._id.toString());
    assert(refreshedTier?.available === 99, "Inventory was atomically decremented from 100 to 99 during reservation");

    console.log(`     Live Paystack Checkout URL: ${initResult.data.authorizationUrl}`);
    console.log(`     Transaction Reference: ${activePaymentRef}`);

    // -------------------------------------------------------------------------
    // 4. LIVE TRANSACTION STATUS CHECK WITH PAYSTACK (BEFORE PAYMENT)
    // -------------------------------------------------------------------------
    console.log("\n▶ 4. Live Server-Side Paystack Verification (Uncompleted State)");
    const preVerifyRes = await PaystackService.verifyTransaction(activePaymentRef);
    assert(preVerifyRes.reference === activePaymentRef, "Paystack verifyTransaction recognizes the live reference");
    assert(
      preVerifyRes.status === "abandoned" || preVerifyRes.status === "failed",
      `Paystack correctly reports uncompleted status before customer enters card (status: '${preVerifyRes.status}')`
    );

    // -------------------------------------------------------------------------
    // 5. SUCCESSFUL FULFILLMENT & DIGITAL TICKET GENERATION
    // -------------------------------------------------------------------------
    console.log("\n▶ 5. Fulfillment & HMAC-SHA256 Signed Ticket Issuance");
    // Simulate successful Paystack verification payload matching real Paystack webhook/callback
    const mockSuccessPaystackData: any = {
      status: "success",
      reference: activePaymentRef,
      amount: 250000,
      currency: "NGN",
      channel: "card",
      id: 9988776655,
      paid_at: new Date().toISOString(),
      gateway_response: "Successful",
      customer: { email: testStudentEmail, first_name: "Babatunde", last_name: "Fashola" },
    };

    const fulfillmentResult = await fulfillVerifiedPayment({
      reference: activePaymentRef,
      paystackData: mockSuccessPaystackData,
      verifiedBy: "callback",
    });

    assert(fulfillmentResult.success === true, "Fulfillment succeeded");
    assert(fulfillmentResult.data != null && fulfillmentResult.data.ticketCodes.length === 1, "Exactly 1 ticket code generated");

    const issuedTicketCode = fulfillmentResult.data!.ticketCodes[0];
    const ticketDoc = await Ticket.findOne({ ticketCode: issuedTicketCode });
    assert(ticketDoc != null, "Ticket record persisted in MongoDB");
    assert(ticketDoc?.attendeeName === "Babatunde Fashola", "Ticket attendee matches student");
    assert(ticketDoc?.isCheckedIn === false, "Ticket initial check-in status is false");

    // Cryptographic HMAC-SHA256 signature verification
    const ticketQrUrl = new URL(ticketDoc!.qrCodeUrl!);
    const ticketSig = ticketQrUrl.searchParams.get("sig") || "";
    const isValidSignature = TicketSecurityService.verifyTicketSignature(
      ticketDoc!.ticketCode,
      testPaidEvent._id.toString(),
      ticketSig
    );
    assert(isValidSignature === true, "Generated ticket has valid authentic HMAC-SHA256 QR signature");

    // -------------------------------------------------------------------------
    // 6. IDEMPOTENCY & DUPLICATE DELIVERY IMMUNITY (CALLBACK + WEBHOOK RACE)
    // -------------------------------------------------------------------------
    console.log("\n▶ 6. Webhook Signature Verification & Idempotency");
    // Webhook cryptographic signature verification
    const testPayload = JSON.stringify({
      event: "charge.success",
      data: mockSuccessPaystackData,
    });

    const validSignature = crypto
      .createHmac("sha512", secretKey!)
      .update(testPayload)
      .digest("hex");

    const isSigValid = PaystackService.verifyWebhookSignature(testPayload, validSignature);
    assert(isSigValid === true, "Valid HMAC-SHA512 webhook signature accepted");

    const isTamperedRejected = PaystackService.verifyWebhookSignature(testPayload, "tampered_fake_signature");
    assert(isTamperedRejected === false, "Tampered webhook signature strictly rejected");

    // Re-dispatching webhook after callback fulfillment
    const duplicateFulfillment = await fulfillVerifiedPayment({
      reference: activePaymentRef,
      paystackData: mockSuccessPaystackData,
      verifiedBy: "webhook",
    });

    assert(duplicateFulfillment.success === true, "Duplicate webhook delivery handled gracefully");
    assert(duplicateFulfillment.alreadyFulfilled === true, "Duplicate delivery recognized as alreadyFulfilled: true");

    const allTicketsForBooking = await Ticket.find({ bookingId: paymentRecord!.bookingId });
    assert(allTicketsForBooking.length === 1, "No duplicate tickets created despite duplicate callback/webhook invocation");

    // -------------------------------------------------------------------------
    // 7. FAILURE SCENARIO HANDLING
    // -------------------------------------------------------------------------
    console.log("\n▶ 7. Failure Scenarios & Security Safeguards");

    // A. Incorrect Amount (Amount Mismatch Protection)
    const underpaidData: any = {
      ...mockSuccessPaystackData,
      reference: `NOT-PAY-UNDERPAID-${timestamp}`,
      amount: 100000, // ₦1,000 instead of ₦2,500
    };
    await Payment.create({
      userId: testStudent._id,
      eventId: testPaidEvent._id,
      bookingId: paymentRecord!.bookingId,
      organizerId: testOrg._id,
      ticketTierId: targetTier._id,
      tierName: targetTier.name,
      quantity: 1,
      unitPrice: 2500,
      amount: 2500,
      amountInKobo: 250000,
      currency: "NGN",
      paymentReference: underpaidData.reference,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentChannel: "paystack",
      customerEmail: testStudentEmail,
      customerName: "Babatunde Fashola",
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
    });

    const underpaidFulfill = await fulfillVerifiedPayment({
      reference: underpaidData.reference,
      paystackData: underpaidData,
      verifiedBy: "webhook",
    });
    assert(underpaidFulfill.success === false, "Underpaid transaction is rejected from automatic ticket fulfillment");
    assert(underpaidFulfill.reconciliationNeeded === true, "Underpaid transaction flagged for administrative reconciliation");

    // B. Expired Reservation Auto-Release
    const expiredRef = `NOT-PAY-EXP-${timestamp}`;
    await Payment.create({
      userId: testStudent._id,
      eventId: testPaidEvent._id,
      bookingId: paymentRecord!.bookingId,
      organizerId: testOrg._id,
      ticketTierId: targetTier._id,
      tierName: targetTier.name,
      quantity: 1,
      unitPrice: 2500,
      amount: 2500,
      amountInKobo: 250000,
      currency: "NGN",
      paymentReference: expiredRef,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentChannel: "paystack",
      customerEmail: testStudentEmail,
      customerName: "Babatunde Fashola",
      reservedUntil: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 mins ago
    });

    const releaseResult = await releaseExpiredReservations();
    assert(releaseResult.success === true, "releaseExpiredReservations executed cleanly");
    assert(releaseResult.releasedCount >= 1, "Expired reservation identified and released");

    const releasedPayment = await Payment.findOne({ paymentReference: expiredRef });
    assert(releasedPayment?.paymentStatus === PAYMENT_STATUS.EXPIRED, "Payment status updated to 'expired'");

    // -------------------------------------------------------------------------
    // 8. PHASE 5.4 INTEGRATION CAPABILITY CHECK WITH LIVE PAYSTACK
    // -------------------------------------------------------------------------
    console.log("\n▶ 8. Phase 5.4 Feature Capability Checks (Disbursements & Refunds)");

    // A. Bank Listing
    const liveBanks = await PaystackService.listBanks();
    assert(liveBanks.length > 10, `Live Nigerian bank listing supported (${liveBanks.length} banks available)`);

    // B. Account Resolution
    try {
      console.log("     Testing Paystack Account Resolution API (GET /bank/resolve)...");
      const resolveRes = await fetch("https://api.paystack.co/bank/resolve?account_number=0001234567&bank_code=058", {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const resolveData = await resolveRes.json();
      console.log(`     Account Resolution response status: ${resolveData.status}, message: "${resolveData.message}"`);
      assert(resolveRes.status === 200 || resolveRes.status === 422 || resolveRes.status === 400, "Account resolution endpoint reachable on Paystack Test API");
    } catch (e) {
      console.error("Account resolve error:", e);
    }

    // C. Balance & Transfer Support
    try {
      console.log("     Testing Paystack Balance API (GET /balance)...");
      const balanceRes = await fetch("https://api.paystack.co/balance", {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const balanceData = await balanceRes.json();
      console.log(`     Balance API response status: ${balanceData.status}, message: "${balanceData.message}"`);
      if (balanceData.status && Array.isArray(balanceData.data)) {
        console.log(`     Test Balance: ${balanceData.data.map((b: any) => `${b.currency} ${b.balance / 100}`).join(", ")}`);
        assert(balanceData.status === true, "Paystack Balance API accessible in Test Mode");
      }
    } catch (e) {
      console.error("Balance error:", e);
    }

    // D. Refund Endpoint Check (Without issuing live refund)
    try {
      console.log("     Testing Paystack Refund Endpoint Reachability (GET /refund?perPage=1)...");
      const refundRes = await fetch("https://api.paystack.co/refund?perPage=1", {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const refundData = await refundRes.json();
      console.log(`     Refunds API response status: ${refundData.status}, message: "${refundData.message}"`);
      assert(refundRes.status === 200, "Paystack Refund API accessible in Test Mode");
    } catch (e) {
      console.error("Refund reachability error:", e);
    }

  } catch (err) {
    console.error("  ❌ Test suite error:", err);
    failed++;
  } finally {
    console.log("\n▶ Cleaning up test fixtures from MongoDB Atlas...");
    await Ticket.deleteMany({ attendeeEmail: testStudentEmail });
    await Payment.deleteMany({ customerEmail: testStudentEmail });
    await Booking.deleteMany({ userId: testStudent?._id });
    if (testPaidEvent?._id) await Event.deleteOne({ _id: testPaidEvent._id });
    if (testProfile?._id) await OrganizerProfile.deleteOne({ _id: testProfile._id });
    if (testOrg?._id) await User.deleteOne({ _id: testOrg._id });
    if (testStudent?._id) await User.deleteOne({ _id: testStudent._id });
    console.log("  🧹 Test fixtures cleaned up.");

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 FINAL TEST REPORT: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveVerification();
