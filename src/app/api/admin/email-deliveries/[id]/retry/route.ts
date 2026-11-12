import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { notificationService } from "@/services/notification.service";

/**
 * POST /api/admin/email-deliveries/[id]/retry
 * Superadmin API to re-dispatch a failed or pending transactional email.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const result = await notificationService.retryFailedDelivery(id);

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.delivery
          ? {
              id: result.delivery._id.toString(),
              recipient: result.delivery.recipient,
              status: result.delivery.status,
              provider: result.delivery.provider,
              retryCount: result.delivery.retryCount,
              lastAttemptAt: result.delivery.lastAttemptAt,
              deliveredAt: result.delivery.deliveredAt,
              error: result.delivery.error,
            }
          : null,
      },
      { status: result.status }
    );
  } catch (err: unknown) {
    const error = err as Error;
    const isForbidden =
      error.message?.includes("Forbidden") ||
      error.message?.includes("Access denied") ||
      error.message?.includes("Admin");

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to retry email delivery",
      },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
