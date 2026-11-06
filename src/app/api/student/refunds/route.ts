import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { RefundRequest } from "@/models/RefundRequest";
import { requestStudentRefund } from "@/lib/financial/refund";
import { createRefundRequestSchema } from "@/validators/financial";

/**
 * GET /api/student/refunds
 * List all refund requests submitted by the student
 */
export async function GET() {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const refunds = await RefundRequest.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .populate("eventId", "title slug startDate venue")
      .populate("bookingId", "bookingReference quantity totalAmount")
      .lean();

    return NextResponse.json({
      success: true,
      refunds: refunds.map((r) => {
        const ev = r.eventId as unknown as { title?: string; slug?: string } | undefined;
        const bk = r.bookingId as unknown as { bookingReference?: string } | undefined;
        return {
          id: r._id.toString(),
          refundReference: r.refundReference,
          bookingReference: bk?.bookingReference || "",
          eventTitle: ev?.title || "Event",
          amount: r.amount,
          reason: r.reason,
          status: r.status,
          rejectionReason: r.rejectionReason,
          reviewedAt: r.reviewedAt,
          createdAt: r.createdAt,
        };
      }),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load refunds" },
      { status: error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}

/**
 * POST /api/student/refunds
 * Submit refund request for an eligible paid booking
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectToDatabase();

    const body = await req.json();
    const validated = createRefundRequestSchema.parse(body);

    const refund = await requestStudentRefund(user.id, validated);

    return NextResponse.json({
      success: true,
      message: "Refund request submitted successfully. Our university administration will review your request.",
      refund: {
        id: refund._id.toString(),
        refundReference: refund.refundReference,
        amount: refund.amount,
        status: refund.status,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit refund request" },
      { status: error.name === "ZodError" ? 400 : 400 }
    );
  }
}
