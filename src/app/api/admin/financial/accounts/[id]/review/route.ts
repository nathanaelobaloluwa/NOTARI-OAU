import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { reviewPayoutAccount } from "@/lib/financial/payout";
import { reviewPayoutAccountSchema } from "@/validators/financial";

/**
 * POST /api/admin/financial/accounts/[id]/review
 * Superadmin endpoint: Approve, reject, or disable organizer payout account
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await connectToDatabase();

    const body = await req.json();
    const validated = reviewPayoutAccountSchema.parse(body);

    const account = await reviewPayoutAccount(admin.id, id, validated);

    return NextResponse.json({
      success: true,
      message: `Payout account ${validated.action}ed successfully.`,
      account: {
        id: account._id.toString(),
        status: account.status,
        verifiedAt: account.verifiedAt,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to review payout account" },
      { status: error.name === "ZodError" ? 400 : error.name === "ForbiddenError" ? 403 : 500 }
    );
  }
}
