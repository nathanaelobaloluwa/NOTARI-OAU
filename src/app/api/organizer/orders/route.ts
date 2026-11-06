import { NextRequest, NextResponse } from "next/server";
import { requireApprovedOrganizer } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * GET /api/organizer/orders
 * Returns orders and payment transactions scoped strictly to the authenticated organizer's events.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApprovedOrganizer(true);
    const organizerProfile = authResult.organizerProfile;

    if (!organizerProfile) {
      return NextResponse.json(
        { success: false, message: "Approved organizer profile not found." },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status") || "all";
    const skip = (page - 1) * limit;

    const organizerId = organizerProfile._id;

    // Filter payments for this organizer
    const filter: Record<string, unknown> = { organizerId };
    if (status !== "all" && Object.values(PAYMENT_STATUS).includes(status as typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS])) {
      filter.paymentStatus = status;
    }

    const [payments, totalCount, statsAgg] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: { organizerId } },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", PAYMENT_STATUS.SUCCESSFUL] }, "$amount", 0],
              },
            },
            pendingRevenue: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$paymentStatus",
                      [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING],
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
            totalTicketsSold: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", PAYMENT_STATUS.SUCCESSFUL] }, "$quantity", 0],
              },
            },
            successfulOrdersCount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", PAYMENT_STATUS.SUCCESSFUL] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || {
      totalRevenue: 0,
      pendingRevenue: 0,
      totalTicketsSold: 0,
      successfulOrdersCount: 0,
    };

    // Populate events and users for the current page
    const eventIds = [...new Set(payments.map((p) => p.eventId.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const userIds = [...new Set(payments.map((p) => p.userId.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const [events, users] = await Promise.all([
      Event.find({ _id: { $in: eventIds } }).select("title slug ticketTiers").lean(),
      User.find({ _id: { $in: userIds } }).select("name email matricNumber").lean(),
    ]);

    const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const orders = payments.map((p) => {
      const event = eventMap.get(p.eventId.toString());
      const user = userMap.get(p.userId.toString());
      const tier = event?.ticketTiers?.find(
        (t) => t._id && t._id.toString() === p.ticketTierId.toString()
      );

      return {
        id: p._id.toString(),
        reference: p.paymentReference,
        studentName: user?.name || "Student",
        studentEmail: user?.email || "",
        matricNumber: user?.matricNumber || null,
        eventTitle: event?.title || "University Event",
        eventSlug: event?.slug || "",
        tierName: tier?.name || "General",
        quantity: p.quantity,
        amount: p.amount,
        currency: p.currency,
        status: p.paymentStatus,
        paymentMethod: p.paymentChannel,
        date: p.paidAt || p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        totalRevenue: stats.totalRevenue,
        pendingRevenue: stats.pendingRevenue,
        totalTicketsSold: stats.totalTicketsSold,
        successfulOrdersCount: stats.successfulOrdersCount,
      },
    });
  } catch (error) {
    console.error("❌ Error retrieving organizer orders:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve orders." },
      { status: 500 }
    );
  }
}
