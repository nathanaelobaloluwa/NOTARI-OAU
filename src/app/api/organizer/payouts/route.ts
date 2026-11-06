import { NextRequest, NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PayoutRequest } from "@/models/PayoutRequest";
import { FinancialLedger } from "@/models/FinancialLedger";
import { PayoutAccount } from "@/models/PayoutAccount";

/**
 * GET /api/organizer/payouts
 * Returns payout requests and recent ledger transactions for the organizer
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const [payouts, totalPayouts, ledgerEntries, payoutAccount] = await Promise.all([
      PayoutRequest.find({ organizerId: authResult.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("payoutAccountId", "bankName accountNumberMasked accountName")
        .lean(),
      PayoutRequest.countDocuments({ organizerId: authResult.id }),
      FinancialLedger.find({ organizerId: authResult.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      PayoutAccount.findOne({ organizerId: authResult.id }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      payouts: payouts.map((p) => {
        const acc = p.payoutAccountId as unknown as { bankName?: string; accountNumberMasked?: string } | undefined;
        return {
          id: p._id.toString(),
          payoutReference: p.payoutReference,
          amount: p.amount,
          amountInKobo: p.amountInKobo,
          currency: p.currency,
          status: p.status,
          bankName: acc?.bankName || "Bank Account",
          accountNumberMasked: acc?.accountNumberMasked || "",
          reviewedAt: p.reviewedAt,
          paidAt: p.paidAt,
          failureReason: p.failureReason,
          createdAt: p.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total: totalPayouts,
        totalPages: Math.ceil(totalPayouts / limit) || 1,
      },
      ledger: ledgerEntries.map((l) => ({
        id: l._id.toString(),
        entryType: l.entryType,
        direction: l.direction,
        amount: l.amount,
        reference: l.reference,
        description: l.description,
        createdAt: l.createdAt,
      })),
      payoutAccount: payoutAccount
        ? {
            id: payoutAccount._id.toString(),
            bankName: payoutAccount.bankName,
            accountNumberMasked: payoutAccount.accountNumberMasked,
            accountName: payoutAccount.accountName,
            status: payoutAccount.status,
          }
        : null,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load payouts" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}
