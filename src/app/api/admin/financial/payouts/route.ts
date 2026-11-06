import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PayoutRequest } from "@/models/PayoutRequest";

/**
 * GET /api/admin/financial/payouts
 * Superadmin endpoint: list all payout requests across platform
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status !== "all") {
      filter.status = status;
    }

    const [payouts, totalCount] = await Promise.all([
      PayoutRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organizerId", "name email")
        .populate("organizerProfileId", "displayName organizationName")
        .populate("payoutAccountId", "bankName accountNumberMasked accountName")
        .lean(),
      PayoutRequest.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      payouts: payouts.map((p) => {
        const org = p.organizerId as unknown as { name?: string; email?: string } | undefined;
        const prof = p.organizerProfileId as unknown as { displayName?: string; organizationName?: string } | undefined;
        const acc = p.payoutAccountId as unknown as { bankName?: string; accountNumberMasked?: string; accountName?: string } | undefined;
        return {
          id: p._id.toString(),
          payoutReference: p.payoutReference,
          organizerName: org?.name || "Organizer",
          organizerEmail: org?.email || "",
          brandName: prof?.displayName || prof?.organizationName || "Brand",
          bankName: acc?.bankName || "Bank",
          accountNumberMasked: acc?.accountNumberMasked || "",
          accountName: acc?.accountName || "",
          amount: p.amount,
          amountInKobo: p.amountInKobo,
          currency: p.currency,
          status: p.status,
          paystackTransferCode: p.paystackTransferCode,
          reviewedAt: p.reviewedAt,
          paidAt: p.paidAt,
          failureReason: p.failureReason,
          createdAt: p.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load payouts" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}
