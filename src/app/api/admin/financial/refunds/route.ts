import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { RefundRequest } from "@/models/RefundRequest";

/**
 * GET /api/admin/financial/refunds
 * Superadmin endpoint: list all refund requests across platform
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

    const [refunds, totalCount] = await Promise.all([
      RefundRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email matricNumber")
        .populate("eventId", "title slug startDate venue")
        .populate("bookingId", "bookingReference quantity totalAmount")
        .populate("organizerId", "name email")
        .lean(),
      RefundRequest.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      refunds: refunds.map((r) => {
        const student = r.userId as unknown as { name?: string; email?: string; matricNumber?: string } | undefined;
        const ev = r.eventId as unknown as { title?: string; slug?: string } | undefined;
        const bk = r.bookingId as unknown as { bookingReference?: string; quantity?: number } | undefined;
        const org = r.organizerId as unknown as { name?: string; email?: string } | undefined;
        return {
          id: r._id.toString(),
          refundReference: r.refundReference,
          studentName: student?.name || "Student",
          studentEmail: student?.email || "",
          studentMatric: student?.matricNumber || "",
          eventTitle: ev?.title || "Event",
          bookingReference: bk?.bookingReference || "",
          ticketQuantity: bk?.quantity || 1,
          organizerName: org?.name || "Organizer",
          amount: r.amount,
          amountInKobo: r.amountInKobo,
          currency: r.currency,
          reason: r.reason,
          status: r.status,
          ticketsInvalidated: r.ticketsInvalidated,
          rejectionReason: r.rejectionReason,
          reviewedAt: r.reviewedAt,
          createdAt: r.createdAt,
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
      { success: false, message: error.message || "Failed to load refunds" },
      { status: error.name === "ForbiddenError" ? 403 : error.name === "AuthorizationError" ? 401 : 500 }
    );
  }
}
