import { NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { PaystackService } from "@/lib/payments/paystack";

/**
 * GET /api/organizer/banks
 * Returns the list of supported Nigerian banks for payout disbursements
 */
export async function GET() {
  try {
    await requireApprovedOrganizer(true);

    const banks = await PaystackService.listBanks("nigeria");
    return NextResponse.json({
      success: true,
      banks: banks.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        slug: b.slug,
      })),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load banks" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}
