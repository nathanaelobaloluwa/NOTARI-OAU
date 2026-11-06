import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { PayoutAccount } from "@/models/PayoutAccount";

/**
 * GET /api/admin/financial/accounts
 * Superadmin endpoint: list organizer bank payout accounts with status filters
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

    const [accounts, totalCount] = await Promise.all([
      PayoutAccount.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("organizerId", "name email matricNumber")
        .populate("organizerProfileId", "displayName organizationName category")
        .lean(),
      PayoutAccount.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      accounts: accounts.map((acc) => {
        const org = acc.organizerId as unknown as { name?: string; email?: string } | undefined;
        const prof = acc.organizerProfileId as unknown as { displayName?: string; organizationName?: string } | undefined;
        return {
          id: acc._id.toString(),
          organizerName: org?.name || "Organizer",
          organizerEmail: org?.email || "",
          brandName: prof?.displayName || prof?.organizationName || "Brand",
          bankName: acc.bankName,
          bankCode: acc.bankCode,
          accountNumberMasked: acc.accountNumberMasked,
          accountName: acc.accountName,
          status: acc.status,
          rejectionReason: acc.rejectionReason,
          verificationNotes: acc.verificationNotes,
          verifiedAt: acc.verifiedAt,
          createdAt: acc.createdAt,
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
      { success: false, message: error.message || "Failed to load payout accounts" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}
