import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { reviewRefundRequest } from "@/lib/financial/refund";
import { reviewRefundRequestSchema } from "@/validators/financial";

/**
 * POST /api/admin/financial/refunds/[id]/review
 * Superadmin endpoint: Review, approve, or reject student refund request
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
    const validated = reviewRefundRequestSchema.parse(body);

    const refund = await reviewRefundRequest(admin.id, id, validated);

    return NextResponse.json({
      success: true,
      message: `Refund request ${refund.refundReference} ${validated.action}ed successfully.`,
      refund: {
        id: refund._id.toString(),
        refundReference: refund.refundReference,
        status: refund.status,
        ticketsInvalidated: refund.ticketsInvalidated,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to review refund request" },
      { status: error.name === "ZodError" ? 400 : error.name === "ForbiddenError" ? 403 : 500 }
    );
  }
}
