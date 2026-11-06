import { NextRequest, NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PayoutAccount } from "@/models/PayoutAccount";
import { submitOrganizerPayoutAccount } from "@/lib/financial/payout";
import { submitPayoutAccountSchema } from "@/validators/financial";

/**
 * GET /api/organizer/payout-account
 * Retrieve current verified or pending payout account for the organizer
 */
export async function GET() {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const account = await PayoutAccount.findOne({ organizerId: authResult.id });

    if (!account) {
      return NextResponse.json({
        success: true,
        account: null,
      });
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account._id.toString(),
        bankName: account.bankName,
        bankCode: account.bankCode,
        accountNumberMasked: account.accountNumberMasked,
        accountName: account.accountName,
        status: account.status,
        verifiedAt: account.verifiedAt,
        rejectionReason: account.rejectionReason,
        verificationNotes: account.verificationNotes,
        updatedAt: account.updatedAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load payout account" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}

/**
 * POST /api/organizer/payout-account
 * Submit bank details for admin verification and disbursement
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const body = await req.json();
    const validated = submitPayoutAccountSchema.parse(body);

    const account = await submitOrganizerPayoutAccount(authResult.id, validated);

    return NextResponse.json({
      success: true,
      message: "Payout account details submitted successfully and queued for administrator review.",
      account: {
        id: account._id.toString(),
        bankName: account.bankName,
        bankCode: account.bankCode,
        accountNumberMasked: account.accountNumberMasked,
        accountName: account.accountName,
        status: account.status,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit payout account" },
      { status: error.name === "ZodError" ? 400 : error.name === "ForbiddenError" ? 403 : 500 }
    );
  }
}
