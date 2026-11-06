import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { getPlatformReconciliationIssues } from "@/lib/financial/ledger";

/**
 * GET /api/admin/financial/reconciliation
 * Superadmin endpoint: Scans the financial state to detect accounting discrepancies
 */
export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();

    const reconciliation = await getPlatformReconciliationIssues();

    return NextResponse.json({
      success: true,
      ...reconciliation,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to run financial reconciliation" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}
