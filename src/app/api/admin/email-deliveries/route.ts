import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { EmailDelivery } from "@/models/EmailDelivery";

/**
 * GET /api/admin/email-deliveries
 * Superadmin API to audit and monitor transactional email deliveries and failures.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Enforce Superadmin Authentication & RBAC
    await requireAdmin();

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const template = searchParams.get("template");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // 2. Build Filter Query
    const query: Record<string, unknown> = {};

    if (status !== "all" && ["sent", "failed", "pending", "simulated"].includes(status)) {
      query.status = status;
    }

    if (template && template !== "all") {
      query.template = template;
    }

    if (search) {
      query.$or = [
        { recipient: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { relatedId: { $regex: search, $options: "i" } },
      ];
    }

    // 3. Execute queries concurrently
    const [deliveries, totalFiltered, totalAll, sentCount, failedCount, simulatedCount] =
      await Promise.all([
        EmailDelivery.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EmailDelivery.countDocuments(query),
        EmailDelivery.countDocuments({}),
        EmailDelivery.countDocuments({ status: "sent" }),
        EmailDelivery.countDocuments({ status: "failed" }),
        EmailDelivery.countDocuments({ status: "simulated" }),
      ]);

    const serializedDeliveries = deliveries.map((d) => ({
      id: d._id.toString(),
      recipient: d.recipient,
      subject: d.subject,
      template: d.template,
      status: d.status,
      provider: d.provider,
      providerMessageId: d.providerMessageId,
      relatedType: d.relatedType,
      relatedId: d.relatedId,
      error: d.error,
      retryCount: d.retryCount,
      lastAttemptAt: d.lastAttemptAt?.toISOString(),
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      deliveries: serializedDeliveries,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit),
        totalFiltered,
      },
      summary: {
        total: totalAll,
        sent: sentCount,
        failed: failedCount,
        simulated: simulatedCount,
      },
    });
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string };
    if (error.name === "AuthorizationError") {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Superadmin access required." },
        { status: 403 }
      );
    }

    console.error("❌ Failed to fetch email deliveries:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch email delivery records." },
      { status: 500 }
    );
  }
}
