import { NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { getOrganizerFinancialSummary } from "@/lib/financial/balance";

/**
 * GET /api/organizer/financial-summary
 * Returns authoritative integer-kobo financial breakdown for organizer dashboard
 */
export async function GET() {
  try {
    const authResult = await requireApprovedOrganizer(true);
    await connectToDatabase();

    const summary = await getOrganizerFinancialSummary(authResult.id);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load financial summary" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}
