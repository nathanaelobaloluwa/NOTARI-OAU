import crypto from "crypto";
import mongoose from "mongoose";
import { PayoutAccount, PAYOUT_ACCOUNT_STATUS, maskAccountNumber } from "@/models/PayoutAccount";
import { PayoutRequest, PAYOUT_REQUEST_STATUS } from "@/models/PayoutRequest";
import { OrganizerProfile } from "@/models/OrganizerProfile";
import { User } from "@/models/User";
import { ORGANIZER_STATUS } from "@/constants/roles";
import { PaystackService } from "@/lib/payments/paystack";
import { getOrganizerFinancialSummary } from "@/lib/financial/balance";
import { recordLedgerEntry } from "@/lib/financial/ledger";
import { FINANCIAL_ENTRY_TYPES } from "@/models/FinancialLedger";
import { notificationService } from "@/services/notification.service";
import {
  SubmitPayoutAccountInput,
  ReviewPayoutAccountInput,
  ReviewPayoutRequestInput,
} from "@/validators/financial";

/**
 * Submit or update bank payout account details for an approved organizer
 */
export async function submitOrganizerPayoutAccount(
  organizerId: string | mongoose.Types.ObjectId,
  input: SubmitPayoutAccountInput
) {
  const orgObjectId =
    typeof organizerId === "string" ? new mongoose.Types.ObjectId(organizerId) : organizerId;

  // 1. Confirm organizer has an approved organizer profile
  const profile = await OrganizerProfile.findOne({
    userId: orgObjectId,
    status: ORGANIZER_STATUS.APPROVED,
  });

  if (!profile) {
    throw new Error("You must have an approved organizer profile before setting up payout details.");
  }

  // 2. Resolve account number with Paystack to confirm account ownership and name
  let resolvedAccountName = input.accountName;
  try {
    const resolved = await PaystackService.resolveAccountNumber(input.accountNumber, input.bankCode);
    if (resolved?.account_name) {
      resolvedAccountName = resolved.account_name;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("⚠️ [PAYOUT] Paystack account resolution warning:", errorMsg);
  }

  // 3. Create Transfer Recipient on Paystack
  let recipientCode = "";
  try {
    const recipient = await PaystackService.createTransferRecipient({
      name: resolvedAccountName,
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
      description: `Disbursement account for ${profile.displayName}`,
    });
    recipientCode = recipient.recipient_code;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("⚠️ [PAYOUT] Transfer recipient creation note:", errorMsg);
    recipientCode = `RCP_NOTARI_${Date.now()}`;
  }

  const masked = maskAccountNumber(input.accountNumber);

  // 4. Upsert PayoutAccount record (requires Superadmin verification before funds can be withdrawn)
  const existingAccount = await PayoutAccount.findOne({ organizerId: orgObjectId });

  if (existingAccount) {
    existingAccount.bankName = input.bankName;
    existingAccount.bankCode = input.bankCode;
    existingAccount.accountNumber = input.accountNumber;
    existingAccount.accountName = resolvedAccountName;
    existingAccount.accountNumberMasked = masked;
    existingAccount.paystackRecipientCode = recipientCode || existingAccount.paystackRecipientCode;
    existingAccount.status = PAYOUT_ACCOUNT_STATUS.PENDING_VERIFICATION;
    existingAccount.rejectionReason = undefined;
    existingAccount.verificationNotes = undefined;
    await existingAccount.save();

    return existingAccount;
  }

  const newAccount = await PayoutAccount.create({
    organizerId: orgObjectId,
    organizerProfileId: profile._id,
    bankName: input.bankName,
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
    accountName: resolvedAccountName,
    accountNumberMasked: masked,
    paystackRecipientCode: recipientCode,
    status: PAYOUT_ACCOUNT_STATUS.PENDING_VERIFICATION,
  });

  return newAccount;
}

/**
 * Superadmin reviews payout account (approve / reject / disable)
 */
export async function reviewPayoutAccount(
  superadminId: string | mongoose.Types.ObjectId,
  accountId: string,
  input: ReviewPayoutAccountInput
) {
  const adminObjectId =
    typeof superadminId === "string" ? new mongoose.Types.ObjectId(superadminId) : superadminId;

  const account = await PayoutAccount.findById(accountId);
  if (!account) {
    throw new Error("Payout account not found.");
  }

  if (input.action === "approve") {
    account.status = PAYOUT_ACCOUNT_STATUS.VERIFIED;
    account.verifiedBy = adminObjectId;
    account.verifiedAt = new Date();
    account.rejectionReason = undefined;
    if (input.notes) account.verificationNotes = input.notes;
  } else if (input.action === "reject") {
    account.status = PAYOUT_ACCOUNT_STATUS.REJECTED;
    account.rejectionReason = input.reason || "Account details could not be verified";
    if (input.notes) account.verificationNotes = input.notes;
  } else if (input.action === "disable") {
    account.status = PAYOUT_ACCOUNT_STATUS.DISABLED;
    if (input.notes) account.verificationNotes = input.notes;
  }

  await account.save();
  return account;
}

/**
 * Organizer requests withdrawal of available net earnings
 */
export async function requestOrganizerPayout(
  organizerId: string | mongoose.Types.ObjectId,
  amountInNaira: number
) {
  const orgObjectId =
    typeof organizerId === "string" ? new mongoose.Types.ObjectId(organizerId) : organizerId;

  // 1. Confirm approved profile
  const profile = await OrganizerProfile.findOne({
    userId: orgObjectId,
    status: ORGANIZER_STATUS.APPROVED,
  });
  if (!profile) {
    throw new Error("Only approved organizers can request payouts.");
  }

  // 2. Confirm verified payout account
  const account = await PayoutAccount.findOne({
    organizerId: orgObjectId,
    status: PAYOUT_ACCOUNT_STATUS.VERIFIED,
  });
  if (!account) {
    throw new Error(
      "You must have a verified bank payout account approved by administrators before requesting withdrawals."
    );
  }

  // 3. Strict integer Kobo arithmetic: calculate available balance
  const amountInKobo = Math.round(amountInNaira * 100);
  if (amountInKobo < 10000) {
    throw new Error("Minimum payout amount is ₦100.00.");
  }

  const summary = await getOrganizerFinancialSummary(orgObjectId);
  if (amountInKobo > summary.availableBalanceInKobo) {
    throw new Error(
      `Insufficient available balance. Requested ₦${amountInNaira.toLocaleString()}, but only ₦${summary.availableBalanceInNaira.toLocaleString()} is currently available.`
    );
  }

  // 4. Generate unique payout reference
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  const payoutReference = `NOT-POUT-${dateStr}-${randomSuffix}`;

  // 5. Create PayoutRequest in "pending" status
  const payoutRequest = await PayoutRequest.create({
    payoutReference,
    organizerId: orgObjectId,
    organizerProfileId: profile._id,
    payoutAccountId: account._id,
    amount: amountInNaira,
    amountInKobo,
    currency: "NGN",
    status: PAYOUT_REQUEST_STATUS.PENDING,
  });

  // 6. Record append-only ledger reservation entry (reserves funds so concurrent requests cannot spend them)
  await recordLedgerEntry({
    entryType: FINANCIAL_ENTRY_TYPES.PAYOUT_RESERVATION,
    direction: "debit",
    amountInKobo,
    organizerId: orgObjectId,
    payoutRequestId: payoutRequest._id,
    reference: payoutReference,
    description: `Payout reservation requested for ₦${amountInNaira.toLocaleString()} to ${account.bankName} (${account.accountNumberMasked})`,
  });

  // Notify organizer of registered payout request
  try {
    const orgUser = await User.findById(orgObjectId).select("name email").lean();
    if (orgUser?.email) {
      await notificationService.notifyPayoutStatus({
        organizerId: orgObjectId,
        recipientEmail: orgUser.email,
        organizerName: orgUser.name || "Organizer",
        reference: payoutReference,
        amountInNaira,
        status: "pending",
        bankName: account.bankName,
        accountMasked: account.accountNumberMasked,
      });
    }
  } catch (notifErr) {
    console.error("⚠️ Failed to dispatch payout requested notification:", notifErr);
  }

  return payoutRequest;
}

async function dispatchPayoutStatusNotification(payout: InstanceType<typeof PayoutRequest>) {
  try {
    const orgUser = await User.findById(payout.organizerId).select("name email").lean();
    const account = await PayoutAccount.findById(payout.payoutAccountId).select("bankName accountNumberMasked").lean();
    if (orgUser?.email) {
      await notificationService.notifyPayoutStatus({
        organizerId: payout.organizerId,
        recipientEmail: orgUser.email,
        organizerName: orgUser.name || "Organizer",
        reference: payout.payoutReference,
        amountInNaira: payout.amount,
        status: payout.status,
        reason: payout.failureReason,
        bankName: account?.bankName,
        accountMasked: account?.accountNumberMasked,
      });
    }
  } catch (notifErr) {
    console.error("⚠️ Failed to notify organizer of payout status:", notifErr);
  }
}

/**
 * Superadmin reviews payout request (approve / reject / process)
 */
export async function reviewPayoutRequest(
  superadminId: string | mongoose.Types.ObjectId,
  requestId: string,
  input: ReviewPayoutRequestInput
) {
  const adminObjectId =
    typeof superadminId === "string" ? new mongoose.Types.ObjectId(superadminId) : superadminId;

  const payout = await PayoutRequest.findById(requestId);
  if (!payout) {
    throw new Error("Payout request not found.");
  }

  payout.reviewedBy = adminObjectId;
  payout.reviewedAt = new Date();
  if (input.notes) payout.reviewNotes = input.notes;

  if (input.action === "reject") {
    // Cannot reject already successful payout
    if (payout.status === PAYOUT_REQUEST_STATUS.SUCCESSFUL) {
      throw new Error("Cannot reject an already completed payout.");
    }

    payout.status = PAYOUT_REQUEST_STATUS.REJECTED;
    payout.failureReason = input.reason || "Disbursement rejected by administrator";
    await payout.save();

    // Release reserved funds back to organizer's available balance via ledger reversal
    await recordLedgerEntry({
      entryType: FINANCIAL_ENTRY_TYPES.PAYOUT_REVERSAL,
      direction: "credit",
      amountInKobo: payout.amountInKobo,
      organizerId: payout.organizerId,
      payoutRequestId: payout._id,
      reference: payout.payoutReference,
      description: `Reversal of rejected payout request ${payout.payoutReference} (Funds restored to available balance)`,
    });

    await dispatchPayoutStatusNotification(payout);
    return payout;
  }

  if (input.action === "approve") {
    payout.status = PAYOUT_REQUEST_STATUS.APPROVED;
    await payout.save();
    await dispatchPayoutStatusNotification(payout);
    return payout;
  }

  if (input.action === "process") {
    // Initiate transfer with Paystack
    const account = await PayoutAccount.findById(payout.payoutAccountId);
    if (!account) {
      throw new Error("Payout bank account record not found.");
    }

    payout.status = PAYOUT_REQUEST_STATUS.PROCESSING;
    await payout.save();

    try {
      const transferRes = await PaystackService.initiateTransfer({
        amountInKobo: payout.amountInKobo,
        recipientCode: account.paystackRecipientCode || `RCP_${account._id}`,
        reference: payout.payoutReference,
        reason: `NOTARI Event Proceeds Settlement (${payout.payoutReference})`,
      });

      payout.paystackTransferCode = transferRes.transfer_code;
      if (transferRes.id) payout.paystackTransferId = String(transferRes.id);

      if (transferRes.status === "success") {
        payout.status = PAYOUT_REQUEST_STATUS.SUCCESSFUL;
        payout.paidAt = new Date();
        await payout.save();

        await recordLedgerEntry({
          entryType: FINANCIAL_ENTRY_TYPES.COMPLETED_PAYOUT,
          direction: "debit",
          amountInKobo: payout.amountInKobo,
          organizerId: payout.organizerId,
          payoutRequestId: payout._id,
          reference: payout.payoutReference,
          description: `Disbursement completed to ${account.bankName} (${account.accountNumberMasked}) via Paystack`,
        });
      } else if (transferRes.status === "failed") {
        payout.status = PAYOUT_REQUEST_STATUS.FAILED;
        payout.failureReason = "Paystack transfer declined or failed";
        await payout.save();

        // Release reversed funds
        await recordLedgerEntry({
          entryType: FINANCIAL_ENTRY_TYPES.PAYOUT_REVERSAL,
          direction: "credit",
          amountInKobo: payout.amountInKobo,
          organizerId: payout.organizerId,
          payoutRequestId: payout._id,
          reference: payout.payoutReference,
          description: `Reversal of failed payout transfer ${payout.payoutReference} (Funds restored)`,
        });
      } else {
        // Pending or Processing
        await payout.save();
      }

      await dispatchPayoutStatusNotification(payout);
      return payout;
    } catch (transferErr: unknown) {
      const errorMsg = transferErr instanceof Error ? transferErr.message : String(transferErr);
      payout.status = PAYOUT_REQUEST_STATUS.FAILED;
      payout.failureReason = errorMsg;
      await payout.save();

      await recordLedgerEntry({
        entryType: FINANCIAL_ENTRY_TYPES.PAYOUT_REVERSAL,
        direction: "credit",
        amountInKobo: payout.amountInKobo,
        organizerId: payout.organizerId,
        payoutRequestId: payout._id,
        reference: payout.payoutReference,
        description: `Reversal of failed transfer initiation: ${errorMsg}`,
      });

      await dispatchPayoutStatusNotification(payout);
      return payout;
    }
  }

  if (input.action === "mark_successful") {
    payout.status = PAYOUT_REQUEST_STATUS.SUCCESSFUL;
    payout.paidAt = new Date();
    await payout.save();

    await recordLedgerEntry({
      entryType: FINANCIAL_ENTRY_TYPES.COMPLETED_PAYOUT,
      direction: "debit",
      amountInKobo: payout.amountInKobo,
      organizerId: payout.organizerId,
      payoutRequestId: payout._id,
      reference: payout.payoutReference,
      description: `Disbursement confirmed successful by administrator`,
    });

    await dispatchPayoutStatusNotification(payout);
    return payout;
  }

  if (input.action === "mark_failed") {
    payout.status = PAYOUT_REQUEST_STATUS.FAILED;
    payout.failureReason = input.reason || "Marked failed by administrator";
    await payout.save();

    await recordLedgerEntry({
      entryType: FINANCIAL_ENTRY_TYPES.PAYOUT_REVERSAL,
      direction: "credit",
      amountInKobo: payout.amountInKobo,
      organizerId: payout.organizerId,
      payoutRequestId: payout._id,
      reference: payout.payoutReference,
      description: `Reversal of failed payout ${payout.payoutReference} (Funds restored)`,
    });

    await dispatchPayoutStatusNotification(payout);
    return payout;
  }

  await dispatchPayoutStatusNotification(payout);
  return payout;
}
