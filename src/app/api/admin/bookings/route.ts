import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Payment, PAYMENT_STATUS } from "@/models/Payment";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Booking } from "@/models/Booking";
import { adminPaymentFilterSchema } from "@/validators/payment";
import mongoose from "mongoose";

/**
 * GET /api/admin/bookings
 * Superadmin ledger of all campus bookings, transactions, and ticket sales across all organizers.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectToDatabase();

    const searchParams = req.nextUrl.searchParams;
    const validation = adminPaymentFilterSchema.safeParse({
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const { status, search, page, limit } = validation.success
      ? validation.data
      : { status: "all", search: undefined, page: 1, limit: 15 };

    const filter: Record<string, unknown> = {};

    if (status !== "all") {
      filter.paymentStatus = status;
    }

    if (search && search.trim()) {
      const trimmed = search.trim();
      // Search matching users or references
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: trimmed, $options: "i" } },
          { email: { $regex: trimmed, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { paymentReference: { $regex: trimmed, $options: "i" } },
        { paystackTransactionId: { $regex: trimmed, $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }

    const skip = (page - 1) * limit;

    const [payments, totalCount, statsAgg] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            platformGrossVolume: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", PAYMENT_STATUS.SUCCESSFUL] }, "$amount", 0],
              },
            },
            platformSuccessfulCount: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", PAYMENT_STATUS.SUCCESSFUL] }, 1, 0],
              },
            },
            platformPendingCount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$paymentStatus",
                      [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalTicketsSold: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", PAYMENT_STATUS.SUCCESSFUL] }, "$quantity", 0],
              },
            },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || {
      platformGrossVolume: 0,
      platformSuccessfulCount: 0,
      platformPendingCount: 0,
      totalTicketsSold: 0,
    };

    // Populate events, users, and bookings
    const eventIds = [...new Set(payments.map((p) => p.eventId.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const userIds = [...new Set(payments.map((p) => p.userId.toString()))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const bookingIds = payments
      .filter((p) => p.bookingId)
      .map((p) => new mongoose.Types.ObjectId(p.bookingId!.toString()));

    const [events, users, bookings] = await Promise.all([
      Event.find({ _id: { $in: eventIds } }).select("title slug ticketTiers").lean(),
      User.find({ _id: { $in: userIds } }).select("name email matricNumber").lean(),
      Booking.find({ _id: { $in: bookingIds } }).select("bookingReference status").lean(),
    ]);

    const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

    const items = payments.map((p) => {
      const event = eventMap.get(p.eventId.toString());
      const user = userMap.get(p.userId.toString());
      const booking = p.bookingId ? bookingMap.get(p.bookingId.toString()) : null;
      const tier = event?.ticketTiers?.find(
        (t) => t._id && t._id.toString() === p.ticketTierId.toString()
      );

      return {
        id: p._id.toString(),
        reference: p.paymentReference,
        paystackReference: p.paystackTransactionId || null,
        bookingReference: booking?.bookingReference || null,
        studentName: user?.name || "Student",
        studentEmail: user?.email || "",
        matricNumber: user?.matricNumber || null,
        eventTitle: event?.title || "University Event",
        eventSlug: event?.slug || "",
        tierName: tier?.name || "General",
        quantity: p.quantity,
        amount: p.amount,
        amountInKobo: p.amountInKobo,
        currency: p.currency,
        status: p.paymentStatus,
        paymentMethod: p.paymentChannel,
        date: p.paidAt || p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        platformGrossVolume: stats.platformGrossVolume,
        platformSuccessfulCount: stats.platformSuccessfulCount,
        platformPendingCount: stats.platformPendingCount,
        totalTicketsSold: stats.totalTicketsSold,
      },
    });
  } catch (error) {
    console.error("❌ Error in admin bookings ledger API:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve platform ledger." },
      { status: 500 }
    );
  }
}
