import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Payment } from "@/models/Payment";
import { Event } from "@/models/Event";
import mongoose from "mongoose";

/**
 * GET /api/student/payments
 * Retrieves the authenticated student's payment history with event information.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        { success: false, message: "Access restricted to student accounts" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    const payments = await Payment.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .lean();

    // Populate event details
    const eventIds = [...new Set(payments.map((p) => p.eventId.toString()))];
    const events = await Event.find({ _id: { $in: eventIds } })
      .select("title slug startDate venue images")
      .lean();

    const eventMap = new Map(events.map((e) => [e._id.toString(), e]));

    const formattedPayments = payments.map((p) => {
      const event = eventMap.get(p.eventId.toString());
      return {
        id: p._id.toString(),
        paymentReference: p.paymentReference,
        amount: p.amount,
        amountInKobo: p.amountInKobo,
        currency: p.currency,
        paymentStatus: p.paymentStatus,
        paymentMethod: p.paymentChannel,
        quantity: p.quantity,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        bookingId: p.bookingId ? p.bookingId.toString() : null,
        event: event
          ? {
              id: event._id.toString(),
              title: event.title,
              slug: event.slug,
              startDate: event.startDate,
              venue: event.venue || "OAU Campus",
              coverImage: event.flyerUrl || null,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
      count: formattedPayments.length,
    });
  } catch (error) {
    console.error("❌ Error retrieving student payments:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve payment history" },
      { status: 500 }
    );
  }
}
