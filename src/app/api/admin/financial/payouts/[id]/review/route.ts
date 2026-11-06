import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { reviewPayoutRequest } from "@/lib/financial/payout";
import { reviewPayoutRequestSchema } from "@/validators/financial";

/**
 * POST /api/admin/financial/payouts/[id]/review
 * Superadmin endpoint: Review, approve, reject, or process payout request
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
    const validated = reviewPayoutRequestSchema.parse(body);

    const payout = await reviewPayoutRequest(admin.id, id, validated);

    return NextResponse.json({
      success: true,
      message: `Payout request updated successfully to '${payout.status}'.`,
      payout: {
        id: payout._id.toString(),
        payoutReference: payout.payoutReference,
        status: payout.status,
        paidAt: payout.paidAt,
        failureReason: payout.failureReason,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to review payout request" },
      { status: error.name === "ZodError" ? 400 : error.name === "ForbiddenError" ? 403 : 500 }
    );
  }
}
