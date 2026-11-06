import mongoose from "mongoose";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { PayoutRequest, PAYOUT_REQUEST_STATUS } from "@/models/PayoutRequest";
import { RefundRequest, REFUND_REQUEST_STATUS } from "@/models/RefundRequest";

export interface OrganizerFinancialSummary {
  grossSalesInKobo: number;
  grossSalesInNaira: number;
  platformFeeRate: number; // e.g. 0
  platformFeeInKobo: number;
  platformFeeInNaira: number;
  refundsInKobo: number;
  refundsInNaira: number;
  netEarningsInKobo: number;
  netEarningsInNaira: number;
  lockedPayoutsInKobo: number;
  lockedPayoutsInNaira: number;
  completedPayoutsInKobo: number;
  completedPayoutsInNaira: number;
  availableBalanceInKobo: number;
  availableBalanceInNaira: number;
  successfulOrdersCount: number;
  pendingOrdersCount: number;
  totalTicketsSold: number;
}

/**
 * Calculates complete organizer financial position using strict integer Kobo arithmetic.
 * Never uses floating-point calculation for balances to eliminate rounding drift.
 */
export async function getOrganizerFinancialSummary(
  organizerId: string | mongoose.Types.ObjectId,
  options?: { platformFeeRate?: number }
): Promise<OrganizerFinancialSummary> {
  const orgObjectId =
    typeof organizerId === "string" ? new mongoose.Types.ObjectId(organizerId) : organizerId;

  // 1. Platform Commission Policy (Default 0% per OAU university policy)
  const platformFeeRate = options?.platformFeeRate ?? 0;

  // 2. Aggregate successful payments for organizer's events
  const successfulPayments = await Payment.aggregate<{
    totalGrossInKobo: number;
    totalTicketsSold: number;
    count: number;
  }>([
    {
      $match: {
        organizerId: orgObjectId,
        paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
      },
    },
    {
      $group: {
        _id: null,
        totalGrossInKobo: { $sum: "$amountInKobo" },
        totalTicketsSold: { $sum: "$quantity" },
        count: { $sum: 1 },
      },
    },
  ]);

  const grossSalesInKobo = Math.round(successfulPayments[0]?.totalGrossInKobo || 0);
  const totalTicketsSold = successfulPayments[0]?.totalTicketsSold || 0;
  const successfulOrdersCount = successfulPayments[0]?.count || 0;

  // 3. Count pending payments awaiting completion
  const pendingOrdersCount = await Payment.countDocuments({
    organizerId: orgObjectId,
    paymentStatus: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING] },
  });

  // 4. Platform fee calculation in integer Kobo
  const platformFeeInKobo = Math.round(grossSalesInKobo * platformFeeRate);

  // 5. Aggregate approved or successful refunds
  const refundsAggregation = await RefundRequest.aggregate<{
    totalRefundsInKobo: number;
  }>([
    {
      $match: {
        organizerId: orgObjectId,
        status: {
          $in: [
            REFUND_REQUEST_STATUS.APPROVED,
            REFUND_REQUEST_STATUS.PROCESSING,
            REFUND_REQUEST_STATUS.SUCCESSFUL,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRefundsInKobo: { $sum: "$amountInKobo" },
      },
    },
  ]);

  const refundsInKobo = Math.round(refundsAggregation[0]?.totalRefundsInKobo || 0);

  // 6. Net Earnings = Gross - Platform Fees - Refunds
  const netEarningsInKobo = Math.max(0, grossSalesInKobo - platformFeeInKobo - refundsInKobo);

  // 7. Aggregate active / locked payout requests (funds reserved awaiting transfer)
  const lockedPayoutsAggregation = await PayoutRequest.aggregate<{
    totalLockedInKobo: number;
  }>([
    {
      $match: {
        organizerId: orgObjectId,
        status: {
          $in: [
            PAYOUT_REQUEST_STATUS.PENDING,
            PAYOUT_REQUEST_STATUS.UNDER_REVIEW,
            PAYOUT_REQUEST_STATUS.APPROVED,
            PAYOUT_REQUEST_STATUS.PROCESSING,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalLockedInKobo: { $sum: "$amountInKobo" },
      },
    },
  ]);

  const lockedPayoutsInKobo = Math.round(lockedPayoutsAggregation[0]?.totalLockedInKobo || 0);

  // 8. Aggregate completed payouts (already disbursed to organizer's bank)
  const completedPayoutsAggregation = await PayoutRequest.aggregate<{
    totalCompletedInKobo: number;
  }>([
    {
      $match: {
        organizerId: orgObjectId,
        status: PAYOUT_REQUEST_STATUS.SUCCESSFUL,
      },
    },
    {
      $group: {
        _id: null,
        totalCompletedInKobo: { $sum: "$amountInKobo" },
      },
    },
  ]);

  const completedPayoutsInKobo = Math.round(
    completedPayoutsAggregation[0]?.totalCompletedInKobo || 0
  );

  // 9. Available Balance = Net Earnings - Locked - Completed
  const availableBalanceInKobo = Math.max(
    0,
    netEarningsInKobo - lockedPayoutsInKobo - completedPayoutsInKobo
  );

  return {
    grossSalesInKobo,
    grossSalesInNaira: grossSalesInKobo / 100,
    platformFeeRate,
    platformFeeInKobo,
    platformFeeInNaira: platformFeeInKobo / 100,
    refundsInKobo,
    refundsInNaira: refundsInKobo / 100,
    netEarningsInKobo,
    netEarningsInNaira: netEarningsInKobo / 100,
    lockedPayoutsInKobo,
    lockedPayoutsInNaira: lockedPayoutsInKobo / 100,
    completedPayoutsInKobo,
    completedPayoutsInNaira: completedPayoutsInKobo / 100,
    availableBalanceInKobo,
    availableBalanceInNaira: availableBalanceInKobo / 100,
    successfulOrdersCount,
    pendingOrdersCount,
    totalTicketsSold,
  };
}
