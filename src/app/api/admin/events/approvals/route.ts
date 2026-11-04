import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Event } from "@/models/Event";
import { EVENT_STATUS } from "@/constants/oau";

/**
 * GET /api/admin/events/approvals
 * List events for Superadmin review with filters, search, and metrics
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "pending_approval";
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const query: Record<string, unknown> = {};

    if (statusParam !== "all") {
      query.status = statusParam;
    }

    if (search && search.length > 0) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      query.$or = [
        { title: searchRegex },
        { organizerName: searchRegex },
        { venue: searchRegex },
        { category: searchRegex },
      ];
    }

    const [events, total, stats] = await Promise.all([
      Event.find(query)
        .populate("organizerId", "name email role isOrganizer matricNumber")
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
      Event.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const metrics = {
      pending: 0,
      published: 0,
      rejected: 0,
      draft: 0,
      cancelled: 0,
      total: 0,
    };

    for (const s of stats) {
      const c = Number(s.count) || 0;
      metrics.total += c;
      if (s._id === EVENT_STATUS.PENDING_APPROVAL) metrics.pending = c;
      else if (s._id === EVENT_STATUS.PUBLISHED) metrics.published = c;
      else if (s._id === EVENT_STATUS.REJECTED) metrics.rejected = c;
      else if (s._id === EVENT_STATUS.DRAFT) metrics.draft = c;
      else if (s._id === EVENT_STATUS.CANCELLED) metrics.cancelled = c;
    }

    return NextResponse.json(
      {
        success: true,
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        metrics,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 401 });
    }
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ success: false, message: error.message }, { status: 403 });
    }
    console.error("❌ Error listing event approvals for admin:", error);
    return NextResponse.json(
      { success: false, message: "Failed to list events for review." },
      { status: 500 }
    );
  }
}
