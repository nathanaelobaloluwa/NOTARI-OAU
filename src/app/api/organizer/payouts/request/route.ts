import { NextRequest, NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { requestOrganizerPayout } from "@/lib/financial/payout";
import { createPayoutRequestSchema } from "@/validators/financial";

/**
 * POST /api/organizer/payouts/request
 * Request withdrawal of available net ticket revenues
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const body = await req.json();
    const validated = createPayoutRequestSchema.parse(body);

    const payout = await requestOrganizerPayout(authResult.id, validated.amount);

    return NextResponse.json({
      success: true,
      message: `Payout request for ₦${validated.amount.toLocaleString()} submitted successfully. Funds have been reserved pending administrator authorization.`,
      payout: {
        id: payout._id.toString(),
        payoutReference: payout.payoutReference,
        amount: payout.amount,
        status: payout.status,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit payout request" },
      { status: error.name === "ZodError" ? 400 : error.name === "ForbiddenError" ? 403 : 400 }
    );
  }
}
