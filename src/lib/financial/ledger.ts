import mongoose from "mongoose";
import {
  FinancialLedger,
  FinancialLedgerEntryType,
  FINANCIAL_ENTRY_TYPES,
} from "@/models/FinancialLedger";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { PayoutRequest, PAYOUT_REQUEST_STATUS } from "@/models/PayoutRequest";
import { RefundRequest, REFUND_REQUEST_STATUS } from "@/models/RefundRequest";

export interface RecordLedgerParams {
  entryType: FinancialLedgerEntryType;
  direction: "credit" | "debit";
  amountInKobo: number;
  organizerId: string | mongoose.Types.ObjectId;
  reference: string;
  description: string;
  eventId?: string | mongoose.Types.ObjectId;
  userId?: string | mongoose.Types.ObjectId;
  paymentId?: string | mongoose.Types.ObjectId;
  payoutRequestId?: string | mongoose.Types.ObjectId;
  refundRequestId?: string | mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only immutable recording of financial movements
 */
export async function recordLedgerEntry(params: RecordLedgerParams) {
  const entry = await FinancialLedger.create({
    entryType: params.entryType,
    direction: params.direction,
    amountInKobo: params.amountInKobo,
    amount: params.amountInKobo / 100,
    currency: "NGN",
    organizerId: new mongoose.Types.ObjectId(String(params.organizerId)),
    eventId: params.eventId ? new mongoose.Types.ObjectId(String(params.eventId)) : undefined,
    userId: params.userId ? new mongoose.Types.ObjectId(String(params.userId)) : undefined,
    paymentId: params.paymentId ? new mongoose.Types.ObjectId(String(params.paymentId)) : undefined,
    payoutRequestId: params.payoutRequestId
      ? new mongoose.Types.ObjectId(String(params.payoutRequestId))
      : undefined,
    refundRequestId: params.refundRequestId
      ? new mongoose.Types.ObjectId(String(params.refundRequestId))
      : undefined,
    reference: params.reference,
    description: params.description,
    metadata: params.metadata,
  });

  return entry;
}

/**
 * Synchronizes any historical successful payments to the append-only ledger
 */
export async function syncHistoricalPaymentsToLedger(): Promise<number> {
  const successfulPayments = await Payment.find({
    paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
  });

  let syncedCount = 0;
  for (const pay of successfulPayments) {
    const exists = await FinancialLedger.exists({ reference: pay.paymentReference });
    if (!exists) {
      await recordLedgerEntry({
        entryType: FINANCIAL_ENTRY_TYPES.TICKET_PAYMENT,
        direction: "credit",
        amountInKobo: pay.amountInKobo,
        organizerId: pay.organizerId,
        eventId: pay.eventId,
        userId: pay.userId,
        paymentId: pay._id,
        reference: pay.paymentReference,
        description: `Backfilled ticket payment record for ${pay.tierName}`,
      });
      syncedCount++;
    }
  }

  return syncedCount;
}

export interface ReconciliationDiscrepancy {
  type: "unrecorded_payment" | "orphan_refund" | "unresolved_payout" | "amount_mismatch";
  severity: "high" | "medium" | "low";
  reference: string;
  details: string;
  timestamp: Date;
}

/**
 * Scans the financial state to detect accounting discrepancies across payments,
 * ledger records, payout requests, and refunds.
 */
export async function getPlatformReconciliationIssues(): Promise<{
  discrepancies: ReconciliationDiscrepancy[];
  totalDiscrepanciesCount: number;
}> {
  const discrepancies: ReconciliationDiscrepancy[] = [];

  // 1. Successful payments missing a ledger entry
  const successfulPayments = await Payment.find({
    paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
  }).limit(200);

  for (const pay of successfulPayments) {
    const ledgerExists = await FinancialLedger.exists({
      reference: pay.paymentReference,
    });
    if (!ledgerExists) {
      discrepancies.push({
        type: "unrecorded_payment",
        severity: "high",
        reference: pay.paymentReference,
        details: `Successful payment of ₦${pay.amount} has no corresponding FinancialLedger entry`,
        timestamp: pay.paidAt || pay.createdAt,
      });
    }
  }

  // 2. Refunds with no corresponding payment record
  const refunds = await RefundRequest.find({
    status: { $in: [REFUND_REQUEST_STATUS.APPROVED, REFUND_REQUEST_STATUS.SUCCESSFUL] },
  }).limit(100);

  for (const ref of refunds) {
    const payment = await Payment.findById(ref.paymentId);
    if (!payment) {
      discrepancies.push({
        type: "orphan_refund",
        severity: "high",
        reference: ref.refundReference,
        details: `Refund ${ref.refundReference} references non-existent payment ${ref.paymentId}`,
        timestamp: ref.createdAt,
      });
    } else if (payment.amountInKobo < ref.amountInKobo) {
      discrepancies.push({
        type: "amount_mismatch",
        severity: "high",
        reference: ref.refundReference,
        details: `Refund amount (₦${ref.amount}) exceeds original payment amount (₦${payment.amount})`,
        timestamp: ref.createdAt,
      });
    }
  }

  // 3. Stale processing payouts (longer than 24 hours without completion or failure)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stuckPayouts = await PayoutRequest.find({
    status: PAYOUT_REQUEST_STATUS.PROCESSING,
    updatedAt: { $lt: oneDayAgo },
  }).limit(50);

  for (const payout of stuckPayouts) {
    discrepancies.push({
      type: "unresolved_payout",
      severity: "medium",
      reference: payout.payoutReference,
      details: `Payout ${payout.payoutReference} has been in processing status for over 24 hours without gateway settlement`,
      timestamp: payout.updatedAt,
    });
  }

  return {
    discrepancies,
    totalDiscrepanciesCount: discrepancies.length,
  };
}
