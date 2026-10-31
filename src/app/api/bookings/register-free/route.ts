import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User, Event, Booking, Ticket, IBookingDocument, ITicketDocument } from "@/models";
import { USER_ROLES } from "@/constants/roles";
import { EVENT_STATUS } from "@/constants/oau";
import { freeRegistrationSchema, generateBookingReference } from "@/validators/booking";
import { TicketSecurityService } from "@/lib/tickets/qr";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user server-side
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to register for events" },
        { status: 401 }
      );
    }

    // 2. Enforce Student Role Authorization
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Only registered students can reserve student event tickets. Switch to a student account to register.",
        },
        { status: 403 }
      );
    }

    // 3. Parse and validate input payload
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = freeRegistrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { eventId, ticketTierId, quantity } = validation.data;

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(ticketTierId)) {
      return NextResponse.json(
        { success: false, message: "Invalid event or ticket tier identifier" },
        { status: 400 }
      );
    }

    // 4. Connect to database
    await connectToDatabase();

    // 5. Query student profile
    const student = await User.findById(session.user.id).select("name email matricNumber role").lean();
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student account not found in database" },
        { status: 404 }
      );
    }

    // 6. Query the event
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    // 7. Verify event status and dates
    if (event.status !== EVENT_STATUS.PUBLISHED) {
      return NextResponse.json(
        { success: false, message: "Registration is only open for published events" },
        { status: 400 }
      );
    }

    if (new Date(event.endDate) < new Date()) {
      return NextResponse.json(
        { success: false, message: "This event has already ended" },
        { status: 400 }
      );
    }

    // 8. Find requested ticket tier
    const targetTierObjectId = new mongoose.Types.ObjectId(ticketTierId);
    const tier = event.ticketTiers.find(
      (t) => t._id && t._id.equals(targetTierObjectId)
    );

    if (!tier) {
      return NextResponse.json(
        { success: false, message: "Selected ticket tier does not exist for this event" },
        { status: 404 }
      );
    }

    // 9. Verify ticket tier is genuinely free (no payment tampering)
    const isFreeTier = event.isFree || tier.price === 0;
    if (!isFreeTier) {
      return NextResponse.json(
        {
          success: false,
          message: "This ticket tier requires payment. Paid checkout will be activated in the next phase.",
        },
        { status: 400 }
      );
    }

    // 10. Check max per order
    const maxPerOrder = tier.maxPerOrder || 5;
    if (quantity > maxPerOrder) {
      return NextResponse.json(
        {
          success: false,
          message: `Requested quantity exceeds the maximum limit of ${maxPerOrder} tickets per order for this tier`,
        },
        { status: 400 }
      );
    }

    // 11. Duplicate registration & hoarding guard
    const existingBookings = await Booking.find({
      userId: student._id,
      eventId: event._id,
      paymentStatus: "successful",
    });

    const alreadyBookedCount = existingBookings.reduce((sum, b) => sum + b.quantity, 0);
    if (alreadyBookedCount + quantity > maxPerOrder) {
      return NextResponse.json(
        {
          success: false,
          message: `You have already registered for ${alreadyBookedCount} ticket(s) for this event. The maximum allowed per student is ${maxPerOrder}.`,
        },
        { status: 400 }
      );
    }

    // 12. Concurrency Protection & Atomic Capacity Decrement with Transaction
    const bookingReference = generateBookingReference();
    let bookingDoc: IBookingDocument | null = null;
    const createdTickets: ITicketDocument[] = [];

    let transactionExecuted = false;
    try {
      const mongoSession = await mongoose.startSession();
      try {
        await mongoSession.withTransaction(async () => {
          // Atomic decrement with condition available >= quantity
          const updatedEvent = await Event.findOneAndUpdate(
            {
              _id: event._id,
              status: EVENT_STATUS.PUBLISHED,
              "ticketTiers._id": targetTierObjectId,
              "ticketTiers.available": { $gte: quantity },
            },
            {
              $inc: {
                registeredCount: quantity,
                "ticketTiers.$.available": -quantity,
              },
            },
            { new: true, session: mongoSession }
          );

          if (!updatedEvent) {
            throw new Error("CAPACITY_EXCEEDED");
          }

          // Create Booking document
          const booking = new Booking({
            bookingReference,
            userId: student._id,
            eventId: event._id,
            ticketTierId: targetTierObjectId,
            quantity,
            unitPrice: 0,
            totalAmount: 0,
            paymentStatus: "successful",
            paymentChannel: "free",
            paidAt: new Date(),
          });
          await booking.save({ session: mongoSession });
          bookingDoc = booking;

          // Create individual Ticket documents
          for (let i = 0; i < quantity; i++) {
            const ticketCode = TicketSecurityService.generateTicketCode();
            const signature = TicketSecurityService.signTicket(ticketCode, event._id.toString());
            const qrCodeUrl = `https://notari-oau.edu.ng/verify/${ticketCode}?sig=${signature}`;

            const ticket = new Ticket({
              bookingId: booking._id,
              eventId: event._id,
              userId: student._id,
              ticketTierId: targetTierObjectId,
              tierName: tier.name,
              ticketCode,
              qrCodeUrl,
              attendeeName: student.name,
              attendeeEmail: student.email,
              pricePaid: 0,
              isCheckedIn: false,
            });
            await ticket.save({ session: mongoSession });
            createdTickets.push(ticket);
          }
        });
        transactionExecuted = true;
      } finally {
        await mongoSession.endSession();
      }
    } catch (txErr: unknown) {
      const err = txErr instanceof Error ? txErr : new Error(String(txErr));
      if (err.message === "CAPACITY_EXCEEDED") {
        return NextResponse.json(
          {
            success: false,
            message: "Sorry, this ticket tier is sold out or insufficient spots remain.",
          },
          { status: 409 }
        );
      }

      // If transactions are not supported by the MongoDB deployment (e.g., standalone testing), fallback:
      if (!transactionExecuted) {
        console.warn("⚠️ Transaction not supported, executing atomic decrement with compensating rollback fallback.");
        const updatedEvent = await Event.findOneAndUpdate(
          {
            _id: event._id,
            status: EVENT_STATUS.PUBLISHED,
            "ticketTiers._id": targetTierObjectId,
            "ticketTiers.available": { $gte: quantity },
          },
          {
            $inc: {
              registeredCount: quantity,
              "ticketTiers.$.available": -quantity,
            },
          },
          { new: true }
        );

        if (!updatedEvent) {
          return NextResponse.json(
            {
              success: false,
              message: "Sorry, this ticket tier is sold out or insufficient spots remain.",
            },
            { status: 409 }
          );
        }

        try {
          const booking = new Booking({
            bookingReference,
            userId: student._id,
            eventId: event._id,
            ticketTierId: targetTierObjectId,
            quantity,
            unitPrice: 0,
            totalAmount: 0,
            paymentStatus: "successful",
            paymentChannel: "free",
            paidAt: new Date(),
          });
          await booking.save();
          bookingDoc = booking;

          for (let i = 0; i < quantity; i++) {
            const ticketCode = TicketSecurityService.generateTicketCode();
            const signature = TicketSecurityService.signTicket(ticketCode, event._id.toString());
            const qrCodeUrl = `https://notari-oau.edu.ng/verify/${ticketCode}?sig=${signature}`;

            const ticket = new Ticket({
              bookingId: booking._id,
              eventId: event._id,
              userId: student._id,
              ticketTierId: targetTierObjectId,
              tierName: tier.name,
              ticketCode,
              qrCodeUrl,
              attendeeName: student.name,
              attendeeEmail: student.email,
              pricePaid: 0,
              isCheckedIn: false,
            });
            await ticket.save();
            createdTickets.push(ticket);
          }
        } catch (compensationErr) {
          // Compensate capacity on failure
          await Event.findOneAndUpdate(
            { _id: event._id, "ticketTiers._id": targetTierObjectId },
            {
              $inc: {
                registeredCount: -quantity,
                "ticketTiers.$.available": quantity,
              },
            }
          );
          throw compensationErr;
        }
      }
    }

    if (!bookingDoc) {
      throw new Error("Booking could not be finalized");
    }

    return NextResponse.json(
      {
        success: true,
        message: "Free ticket registration successful!",
        data: {
          bookingReference: (bookingDoc as IBookingDocument).bookingReference,
          bookingId: (bookingDoc as IBookingDocument)._id.toString(),
          event: {
            id: event._id.toString(),
            title: event.title,
            slug: event.slug,
            venue: event.venue,
            startDate: event.startDate,
            endDate: event.endDate,
          },
          tickets: createdTickets.map((t) => ({
            id: t._id.toString(),
            ticketCode: t.ticketCode,
            tierName: t.tierName,
            attendeeName: t.attendeeName,
            attendeeEmail: t.attendeeEmail,
            qrCodeUrl: t.qrCodeUrl,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Free registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while processing your registration. Please try again.",
      },
      { status: 500 }
    );
  }
}
