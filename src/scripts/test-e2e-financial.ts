import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Event } from "../models/Event";
import { Booking } from "../models/Booking";
import { Ticket } from "../models/Ticket";
import { Payment, PAYMENT_STATUS } from "../models/Payment";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { PayoutAccount, PAYOUT_ACCOUNT_STATUS, maskAccountNumber } from "../models/PayoutAccount";
import { PayoutRequest, PAYOUT_REQUEST_STATUS } from "../models/PayoutRequest";
import { RefundRequest, REFUND_REQUEST_STATUS } from "../models/RefundRequest";
import { FinancialLedger, FINANCIAL_ENTRY_TYPES } from "../models/FinancialLedger";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { EVENT_STATUS } from "../constants/oau";
import { PaystackService } from "../lib/payments/paystack";
import { getOrganizerFinancialSummary } from "../lib/financial/balance";
import {
  submitOrganizerPayoutAccount,
  reviewPayoutAccount,
  requestOrganizerPayout,
  reviewPayoutRequest,
} from "../lib/financial/payout";
import { requestStudentRefund, reviewRefundRequest } from "../lib/financial/refund";
import {
  getPlatformReconciliationIssues,
  syncHistoricalPaymentsToLedger,
} from "../lib/financial/ledger";
import { fulfillVerifiedPayment } from "../lib/payments/fulfillment";

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

async function runFinancialE2E() {
  console.log("\n================================================================================");
  console.log("💰 NOTARI 2.0: END-TO-END FINANCIAL SETTLEMENT, PAYOUTS & REFUNDS AUDIT (PHASE 5.4)");
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

  // Setup Paystack mock fetch handler for comprehensive test coverage
  PaystackService.setMockFetchHandler(async (url: string, init?: RequestInit) => {
    if (url.includes("/bank?country=nigeria")) {
      return {
        status: true,
        message: "Banks retrieved",
        data: [
          { id: 1, name: "Guaranty Trust Bank", code: "058", slug: "gtbank", active: true, country: "Nigeria", currency: "NGN" },
          { id: 2, name: "First Bank of Nigeria", code: "011", slug: "first-bank", active: true, country: "Nigeria", currency: "NGN" },
          { id: 3, name: "Access Bank", code: "044", slug: "access-bank", active: true, country: "Nigeria", currency: "NGN" },
        ],
      };
    }
    if (url.includes("/bank/resolve")) {
      const parsedUrl = new URL(url);
      const accNum = parsedUrl.searchParams.get("account_number");
      return {
        status: true,
        message: "Account resolved",
        data: {
          account_number: accNum || "0123456789",
          account_name: "OAU IFE STUDENT UNION",
          bank_id: 1,
        },
      };
    }
    if (url.includes("/transferrecipient")) {
      const body = JSON.parse((init?.body as string) || "{}");
      return {
        status: true,
        message: "Recipient created",
        data: {
          recipient_code: `RCP_TEST_${Date.now()}`,
          type: "nuban",
          name: body.name,
          details: {
            account_number: body.account_number,
            account_name: body.name,
            bank_code: body.bank_code,
            bank_name: "Guaranty Trust Bank",
          },
          active: true,
          id: 12345,
          currency: "NGN",
        },
      };
    }
    if (url.includes("/transfer")) {
      const body = JSON.parse((init?.body as string) || "{}");
      return {
        status: true,
        message: "Transfer queued",
        data: {
          reference: body.reference,
          amount: body.amount,
          transfer_code: `TRF_TEST_${Date.now()}`,
          id: 67890,
          status: "success",
          recipient: body.recipient,
        },
      };
    }
    if (url.includes("/refund")) {
      const body = JSON.parse((init?.body as string) || "{}");
      return {
        status: true,
        message: "Refund has been queued",
        data: {
          id: 112233,
          transaction: body.transaction,
          amount: body.amount || 500000,
          currency: "NGN",
          status: "success",
          refunded_by: "test_admin",
          refunded_at: new Date().toISOString(),
        },
      };
    }
    return { status: false, message: "Unhandled mock url in tests" };
  });

  try {
    // =========================================================================
    // SUITE 1: Paystack Service Banking & Transfers API Boundary
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("📋 SUITE 1: Paystack Service Banking & Transfers API Boundary");
    console.log("--------------------------------------------------------------------------------");

    // 1.1 List Banks
    const banks = await PaystackService.listBanks("nigeria");
    assert(Array.isArray(banks) && banks.length >= 3, "PaystackService.listBanks returns array of supported Nigerian banks");
    assert(banks.some((b) => b.code === "058" && b.name.includes("Guaranty")), "List of banks contains GTBank (code 058)");

    // 1.2 Account Number Masking Helper
    const masked1 = maskAccountNumber("0123456789");
    assert(masked1 === "******6789", `maskAccountNumber correctly masks 10-digit NUBAN: expected '******6789', got '${masked1}'`);
    const maskedShort = maskAccountNumber("123");
    assert(maskedShort === "123", "maskAccountNumber preserves short numbers without negative padding");

    // 1.3 Resolve Account Number
    const resolved = await PaystackService.resolveAccountNumber("0123456789", "058");
    assert(resolved.account_name === "OAU IFE STUDENT UNION", "PaystackService.resolveAccountNumber returns verified bank account name");

    // 1.4 Create Transfer Recipient
    const recipient = await PaystackService.createTransferRecipient({
      name: "OAU IFE STUDENT UNION",
      accountNumber: "0123456789",
      bankCode: "058",
    });
    assert(recipient.recipient_code.startsWith("RCP_"), "PaystackService.createTransferRecipient generates valid recipient_code");

    // 1.5 Initiate Transfer
    const transferRes = await PaystackService.initiateTransfer({
      amountInKobo: 500000,
      recipientCode: recipient.recipient_code,
      reference: `NOT-POUT-TEST-${Date.now()}`,
    });
    assert(transferRes.status === "success" && transferRes.transfer_code.startsWith("TRF_"), "PaystackService.initiateTransfer dispatches payout transfer");

    // 1.6 Initiate Refund
    const refundRes = await PaystackService.initiateRefund({
      transactionRefOrId: "NOT-PAY-TEST-REF",
      amountInKobo: 250000,
      customerNote: "Event cancellation refund",
    });
    assert(refundRes.status === "success" && refundRes.id === 112233, "PaystackService.initiateRefund dispatches transaction refund");

    if (!isConnected) {
      console.log("\n⚠️  Skipping database integration suites (MongoDB offline).");
      return;
    }

    // =========================================================================
    // SUITE 2: Organizer Payout Account Management & Masking
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🏦 SUITE 2: Organizer Payout Account Submission, Masking & Admin Review");
    console.log("--------------------------------------------------------------------------------");

    const runId = Date.now();
    const passwordHash = await bcrypt.hash("P@ssword123!", 4);

    // Create Superadmin
    const adminUser = await User.create({
      name: "Super Admin Fin",
      email: `admin.fin.${runId}@oauife.edu.ng`,
      password: passwordHash,
      role: USER_ROLES.ADMIN,
      isEmailVerified: true,
      matricNumber: `ADM/FIN/${runId.toString().slice(-4)}`,
    });

    // Create Approved Organizer
    const orgUser = await User.create({
      name: "Great Ife Tech Hub",
      email: `techhub.${runId}@oauife.edu.ng`,
      password: passwordHash,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      isEmailVerified: true,
      matricNumber: `CSC/ORG/${runId.toString().slice(-4)}`,
    });

    const orgProfile = await OrganizerProfile.create({
      userId: orgUser._id,
      organizationName: "Great Ife Tech Hub",
      displayName: "OAU Tech Hub",
      category: "Academic",
      description: "Official technology and innovation society at OAU",
      contactEmail: `techhub.${runId}@oauife.edu.ng`,
      contactPhone: "08012345678",
      status: ORGANIZER_STATUS.APPROVED,
    });

    // Create Unapproved Organizer
    const unapprovedOrg = await User.create({
      name: "Pending Org User",
      email: `pending.org.${runId}@oauife.edu.ng`,
      password: passwordHash,
      role: USER_ROLES.STUDENT,
      isEmailVerified: true,
      matricNumber: `SOC/PND/${runId.toString().slice(-4)}`,
    });

    // 2.1 Unapproved organizer cannot submit payout account
    let unapprovedBlocked = false;
    try {
      await submitOrganizerPayoutAccount(unapprovedOrg._id, {
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        accountName: "Unapproved Org",
      });
    } catch {
      unapprovedBlocked = true;
    }
    assert(unapprovedBlocked, "Unapproved organizer profile is blocked from submitting payout account");

    // 2.2 Approved organizer submits payout account
    const payoutAccount = await submitOrganizerPayoutAccount(orgUser._id, {
      bankCode: "058",
      bankName: "Guaranty Trust Bank",
      accountNumber: "0123456789",
      accountName: "Great Ife Tech Hub",
    });
    assert(payoutAccount.status === PAYOUT_ACCOUNT_STATUS.PENDING_VERIFICATION, "Submitted payout account has status 'pending_verification'");
    assert(payoutAccount.accountNumberMasked === "******6789", "Bank account number is masked in the database record");
    assert(payoutAccount.paystackRecipientCode?.startsWith("RCP_"), "Paystack transfer recipient code is stored");

    // 2.3 Superadmin reviews and approves payout account
    const verifiedAccount = await reviewPayoutAccount(adminUser._id, payoutAccount._id.toString(), {
      action: "approve",
      notes: "Verified against CAC and OAU DSA registry",
    });
    assert(verifiedAccount.status === PAYOUT_ACCOUNT_STATUS.VERIFIED, "Superadmin approval marks payout account 'verified'");
    assert(verifiedAccount.verifiedBy?.toString() === adminUser._id.toString(), "verifiedBy references acting superadmin");

    // =========================================================================
    // SUITE 3: Strict Integer-Kobo Financial Accounting & Balance Calculation
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📊 SUITE 3: Strict Integer-Kobo Accounting & Double-Counting Safeguards");
    console.log("--------------------------------------------------------------------------------");

    // Create student
    const studentUser = await User.create({
      name: "Kolawole Adeleke",
      email: `adeleke.k.${runId}@oauife.edu.ng`,
      password: passwordHash,
      role: USER_ROLES.STUDENT,
      isEmailVerified: true,
      matricNumber: `MED/2022/${runId.toString().slice(-4)}`,
    });

    // Create paid event owned by approved organizer
    const paidTierId = new mongoose.Types.ObjectId();
    const event = await Event.create({
      title: "Great Ife Annual Software Summit",
      slug: `great-ife-software-summit-${runId}`,
      description: "Annual university software development festival",
      category: "Tech & Innovation",
      status: EVENT_STATUS.PUBLISHED,
      organizerId: orgUser._id,
      organizerName: orgUser.name,
      venue: "Oduduwa Hall",
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      totalCapacity: 500,
      registeredCount: 0,
      isFree: false,
      ticketTiers: [
        {
          _id: paidTierId,
          name: "Standard Student Pass",
          price: 5000, // 5,000 NGN
          capacity: 100,
          available: 98,
        },
      ],
    });

    // Create Booking for 2 tickets = 10,000 NGN (1,000,000 Kobo)
    const bookingRef = `NOT-BK-${runId}`;
    const payRef = `NOT-PAY-${runId}`;
    const booking = await Booking.create({
      bookingReference: bookingRef,
      userId: studentUser._id,
      eventId: event._id,
      organizerId: orgUser._id,
      ticketTierId: paidTierId,
      quantity: 2,
      unitPrice: 5000,
      totalAmount: 10000,
      paymentStatus: "pending",
      paymentReference: payRef,
      paymentChannel: "paystack",
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
    });

    const payment = await Payment.create({
      userId: studentUser._id,
      eventId: event._id,
      bookingId: booking._id,
      organizerId: orgUser._id,
      ticketTierId: paidTierId,
      tierName: "Standard Student Pass",
      quantity: 2,
      unitPrice: 5000,
      amount: 10000,
      amountInKobo: 1000000, // 10,000 * 100
      currency: "NGN",
      paymentReference: payRef,
      paymentStatus: PAYMENT_STATUS.PENDING,
      customerEmail: studentUser.email,
      customerName: studentUser.name,
      reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
    });

    // 3.1 Fulfill payment and verify ledger recording
    const fulfillment = await fulfillVerifiedPayment({
      reference: payRef,
      paystackData: {
        status: "success",
        reference: payRef,
        amount: 1000000,
        currency: "NGN",
        id: 887766,
        gateway_response: "Approved",
        customer: { email: studentUser.email },
      },
      verifiedBy: "callback",
    });

    assert(fulfillment.success, "Payment fulfilled and 2 authentic tickets generated");

    const ledgerEntry = await FinancialLedger.findOne({ reference: payRef });
    assert(ledgerEntry !== null, "FinancialLedger append-only record created automatically for fulfilled payment");
    assert(ledgerEntry?.entryType === FINANCIAL_ENTRY_TYPES.TICKET_PAYMENT, "Ledger entry type is 'ticket_payment'");
    assert(ledgerEntry?.amountInKobo === 1000000, "Ledger amount matches exact integer Kobo (1,000,000)");

    // 3.2 Check authoritative balance calculation
    const summaryBefore = await getOrganizerFinancialSummary(orgUser._id);
    assert(summaryBefore.grossSalesInKobo === 1000000, "Gross sales calculated correctly in integer Kobo (1,000,000)");
    assert(summaryBefore.grossSalesInNaira === 10000, "Gross sales correctly formatted in Naira (₦10,000)");
    assert(summaryBefore.platformFeeInKobo === 0, "Platform fee is ₦0 per university policy");
    assert(summaryBefore.netEarningsInKobo === 1000000, "Net earnings = Gross - Fee (1,000,000 Kobo)");
    assert(summaryBefore.availableBalanceInKobo === 1000000, "Available balance equals net earnings before any payouts (₦10,000)");

    // =========================================================================
    // SUITE 4: Payout Requests, Ledger Reservations & Anti-Concurrency Lock
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🔒 SUITE 4: Payout Requests, Ledger Reservations & Concurrency Protection");
    console.log("--------------------------------------------------------------------------------");

    // 4.1 Withdrawal exceeding available balance is rejected
    let excessBlocked = false;
    try {
      await requestOrganizerPayout(orgUser._id, 15000); // ₦15,000 exceeds ₦10,000
    } catch {
      excessBlocked = true;
    }
    assert(excessBlocked, "Withdrawal request exceeding available balance is strictly rejected");

    // 4.2 Valid withdrawal request reserves funds
    const payoutReq1 = await requestOrganizerPayout(orgUser._id, 4000); // ₦4,000 (400,000 Kobo)
    assert(payoutReq1.status === PAYOUT_REQUEST_STATUS.PENDING, "Valid payout request created with status 'pending'");
    assert(payoutReq1.amountInKobo === 400000, "Payout request stores exact integer Kobo (400,000)");

    // 4.3 Check reservation reduced available balance immediately
    const summaryMid = await getOrganizerFinancialSummary(orgUser._id);
    assert(summaryMid.lockedPayoutsInKobo === 400000, "Locked payouts equals reserved 400,000 Kobo");
    assert(summaryMid.availableBalanceInKobo === 600000, "Available balance reduced to 600,000 Kobo (₦6,000)");
    assert(summaryMid.availableBalanceInNaira === 6000, "Available balance in Naira is ₦6,000");

    // 4.4 Concurrent withdrawal attempt for ₦7,000 is rejected because only ₦6,000 is available
    let concurrentBlocked = false;
    try {
      await requestOrganizerPayout(orgUser._id, 7000);
    } catch {
      concurrentBlocked = true;
    }
    assert(concurrentBlocked, "Subsequent/concurrent withdrawal exceeding remainder (₦7,000 > ₦6,000) is rejected");

    // =========================================================================
    // SUITE 5: Superadmin Payout Approval, Transfer Dispatch & Reversals
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("💸 SUITE 5: Superadmin Payout Authorization, Transfer Execution & Reversals");
    console.log("--------------------------------------------------------------------------------");

    // 5.1 Superadmin approves payout request
    const approvedPayout = await reviewPayoutRequest(adminUser._id, payoutReq1._id.toString(), {
      action: "approve",
      notes: "Authorized by University Auditor",
    });
    assert(approvedPayout.status === PAYOUT_REQUEST_STATUS.APPROVED, "Superadmin review marks payout 'approved'");

    // 5.2 Superadmin processes payout (triggers Paystack Transfer)
    const processedPayout = await reviewPayoutRequest(adminUser._id, payoutReq1._id.toString(), {
      action: "process",
    });
    assert(processedPayout.status === PAYOUT_REQUEST_STATUS.SUCCESSFUL, "Disbursement completed successfully via Paystack");
    assert(processedPayout.paystackTransferCode?.startsWith("TRF_"), "Transfer code stored on payout record");

    // 5.3 Verify completed payout ledger debit
    const payoutLedgerEntry = await FinancialLedger.findOne({
      reference: payoutReq1.payoutReference,
      entryType: FINANCIAL_ENTRY_TYPES.COMPLETED_PAYOUT,
    });
    assert(payoutLedgerEntry !== null, "Completed payout recorded in FinancialLedger as debit");

    const summaryAfterPayout = await getOrganizerFinancialSummary(orgUser._id);
    assert(summaryAfterPayout.completedPayoutsInKobo === 400000, "Completed payouts reflects disbursed 400,000 Kobo");
    assert(summaryAfterPayout.availableBalanceInKobo === 600000, "Available balance remains stable at 600,000 Kobo");

    // 5.4 Test Reversal: create second payout for ₦2,000 and reject it
    const payoutReq2 = await requestOrganizerPayout(orgUser._id, 2000);
    const rejectedPayout = await reviewPayoutRequest(adminUser._id, payoutReq2._id.toString(), {
      action: "reject",
      reason: "Account flagged for documentation review",
    });
    assert(rejectedPayout.status === PAYOUT_REQUEST_STATUS.REJECTED, "Superadmin rejects payout request");

    // Check reversal ledger entry
    const reversalLedgerEntry = await FinancialLedger.findOne({
      reference: payoutReq2.payoutReference,
      entryType: FINANCIAL_ENTRY_TYPES.PAYOUT_REVERSAL,
    });
    assert(reversalLedgerEntry !== null, "Reversal credit entry recorded in FinancialLedger");
    assert(reversalLedgerEntry?.direction === "credit", "Reversal entry direction is 'credit'");

    const summaryAfterReversal = await getOrganizerFinancialSummary(orgUser._id);
    assert(summaryAfterReversal.availableBalanceInKobo === 600000, "Available balance restored to ₦6,000 after rejection reversal");

    // =========================================================================
    // SUITE 6: Student Ticket Refund Workflow & Ticket QR Invalidation
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🎫 SUITE 6: Student Ticket Refund Lifecycle & Authentic QR Invalidation");
    console.log("--------------------------------------------------------------------------------");

    // 6.1 Unauthorized student cannot request refund for another student's booking
    let unauthRefundBlocked = false;
    try {
      await requestStudentRefund(adminUser._id, {
        bookingId: booking._id.toString(),
        reason: "Unauthorized attempt",
      });
    } catch {
      unauthRefundBlocked = true;
    }
    assert(unauthRefundBlocked, "User cannot request refund for a booking they do not own");

    // 6.2 Student submits valid refund request
    const refundRequest = await requestStudentRefund(studentUser._id, {
      bookingId: booking._id.toString(),
      reason: "Course practical conflict with event schedule",
    });
    assert(refundRequest.status === REFUND_REQUEST_STATUS.PENDING, "Refund request submitted with status 'pending'");
    assert(refundRequest.amountInKobo === 1000000, "Refund request amount matches booking total in Kobo (1,000,000)");

    // 6.3 Duplicate refund request is prevented
    let duplicateRefundBlocked = false;
    try {
      await requestStudentRefund(studentUser._id, {
        bookingId: booking._id.toString(),
        reason: "Duplicate attempt",
      });
    } catch {
      duplicateRefundBlocked = true;
    }
    assert(duplicateRefundBlocked, "Duplicate refund request on same booking is rejected");

    // 6.4 Superadmin reviews and approves refund
    const approvedRefund = await reviewRefundRequest(adminUser._id, refundRequest._id.toString(), {
      action: "approve",
      notes: "Refund authorized per OAU academic timetable clash policy",
    });
    assert(approvedRefund.status === REFUND_REQUEST_STATUS.SUCCESSFUL, "Superadmin approval marks refund 'successful'");
    assert(approvedRefund.ticketsInvalidated === true, "Refund flags tickets as invalidated");

    // 6.5 Verify all tickets under booking are invalidated and cannot be checked in
    const invalidatedTickets = await Ticket.find({ bookingId: booking._id });
    assert(invalidatedTickets.length === 2, "Found 2 tickets under refunded booking");
    assert(
      invalidatedTickets.every((t) => t.isInvalidated === true && t.isCheckedIn === false),
      "All refunded tickets have isInvalidated=true and isCheckedIn=false (voided for entrance)"
    );

    // 6.6 Verify Booking and Payment states are 'refunded'
    const updatedBooking = await Booking.findById(booking._id);
    const updatedPayment = await Payment.findById(payment._id);
    assert(updatedBooking?.paymentStatus === "refunded", "Booking paymentStatus updated to 'refunded'");
    assert(updatedPayment?.paymentStatus === PAYMENT_STATUS.REFUNDED, "Payment paymentStatus updated to 'refunded'");

    // 6.7 Verify refund recorded in Financial Ledger
    const refundLedgerEntry = await FinancialLedger.findOne({
      reference: refundRequest.refundReference,
      entryType: FINANCIAL_ENTRY_TYPES.REFUND,
    });
    assert(refundLedgerEntry !== null, "Refund debit entry recorded in FinancialLedger");
    assert(refundLedgerEntry?.direction === "debit", "Refund ledger entry direction is 'debit'");

    // 6.8 Verify balance after refund
    const summaryAfterRefund = await getOrganizerFinancialSummary(orgUser._id);
    assert(summaryAfterRefund.refundsInKobo === 1000000, "Refunds total reflects full 1,000,000 Kobo refund");
    assert(summaryAfterRefund.netEarningsInKobo === 0, "Net earnings reduced to 0 after refund");
    assert(summaryAfterRefund.availableBalanceInKobo === 0, "Available balance correctly reflects 0 Kobo (clamped non-negative)");

    // =========================================================================
    // SUITE 7: Financial Ledger Integrity & Reconciliation Audit
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🔍 SUITE 7: Financial Ledger Integrity & Reconciliation Audit");
    console.log("--------------------------------------------------------------------------------");

    // Run platform reconciliation audit
    await syncHistoricalPaymentsToLedger();
    const reconciliation = await getPlatformReconciliationIssues();
    assert(typeof reconciliation.totalDiscrepanciesCount === "number", "Reconciliation check completes successfully");
    assert(reconciliation.totalDiscrepanciesCount === 0, "Zero reconciliation discrepancies detected across valid transactions");

    // =========================================================================
    // SUITE 8: Multi-Tenancy & Authorization Boundaries
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("🛡️ SUITE 8: Multi-Tenancy Isolation & Privilege Boundaries");
    console.log("--------------------------------------------------------------------------------");

    // Create Second Organizer
    const orgUser2 = await User.create({
      name: "Great Ife Literary Society",
      email: `lit.soc.${runId}@oauife.edu.ng`,
      password: passwordHash,
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      isEmailVerified: true,
      matricNumber: `LIT/ORG/${runId.toString().slice(-4)}`,
    });

    const orgProfile2 = await OrganizerProfile.create({
      userId: orgUser2._id,
      organizationName: "Great Ife Literary Society",
      displayName: "OAU Literary Society",
      category: "Arts",
      description: "University arts and literature society",
      contactEmail: `lit.soc.${runId}@oauife.edu.ng`,
      contactPhone: "08098765432",
      status: ORGANIZER_STATUS.APPROVED,
    });

    // Organizer 2 balance is 0 and completely isolated from Organizer 1
    const summaryOrg2 = await getOrganizerFinancialSummary(orgUser2._id);
    assert(summaryOrg2.grossSalesInKobo === 0, "Organizer 2 gross sales is strictly 0 (multi-tenant isolation verified)");
    assert(summaryOrg2.availableBalanceInKobo === 0, "Organizer 2 available balance is strictly 0");

    // Organizer 2 cannot withdraw
    let org2WithdrawBlocked = false;
    try {
      await requestOrganizerPayout(orgUser2._id, 1000);
    } catch {
      org2WithdrawBlocked = true;
    }
    assert(org2WithdrawBlocked, "Organizer 2 without verified payout account cannot request withdrawal");

    // Cleanup test data
    console.log("\n🧹 Cleaning up test artifacts...");
    await Promise.all([
      User.deleteMany({ email: { $regex: `${runId}` } }),
      OrganizerProfile.deleteMany({ _id: { $in: [orgProfile._id, orgProfile2._id] } }),
      Event.deleteMany({ _id: event._id }),
      Booking.deleteMany({ _id: booking._id }),
      Ticket.deleteMany({ bookingId: booking._id }),
      Payment.deleteMany({ _id: payment._id }),
      PayoutAccount.deleteMany({ organizerId: orgUser._id }),
      PayoutRequest.deleteMany({ organizerId: orgUser._id }),
      RefundRequest.deleteMany({ bookingId: booking._id }),
      FinancialLedger.deleteMany({ organizerId: { $in: [orgUser._id, orgUser2._id] } }),
    ]);
    console.log(" Cleaned up test database records.\n");

  } catch (testErr) {
    console.error("💥 Unhandled error in financial E2E test:", testErr);
    failed++;
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected from MongoDB.");
    }
  }

  console.log("\n================================================================================");
  console.log(`📊 FINAL TEST REPORT (PHASE 5.4 FINANCIAL AUDIT): ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFinancialE2E();
