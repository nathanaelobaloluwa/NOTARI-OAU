import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User, Event, Booking, Ticket, IBookingDocument, ITicketDocument } from "@/models";
import { USER_ROLES } from "@/constants/roles";
import { EVENT_STATUS } from "@/constants/oau";
import { generateBookingReference } from "@/validators/booking";
import { TicketSecurityService } from "@/lib/tickets/qr";

export interface ProcessFreeRegistrationParams {
  studentId: string;
  eventId: string;
  ticketTierId: string;
  quantity: number;
}

export interface ProcessFreeRegistrationResult {
  success: boolean;
  status: number;
  message: string;
  data?: {
    bookingReference: string;
    bookingId: string;
    event: {
      id: string;
      title: string;
      slug: string;
      venue: string;
      startDate: Date;
      endDate: Date;
    };
    tickets: Array<{
      id: string;
      ticketCode: string;
      tierName: string;
      attendeeName: string;
      attendeeEmail: string;
      qrCodeUrl?: string;
    }>;
  };
}

/**
 * Core business logic for free ticket registration with strict concurrency & anti-overselling protection
 */
export async function processFreeRegistration({
  studentId,
  eventId,
  ticketTierId,
  quantity,
}: ProcessFreeRegistrationParams): Promise<ProcessFreeRegistrationResult> {
  if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(ticketTierId)) {
    return {
      success: false,
      status: 400,
      message: "Invalid event or ticket tier identifier",
    };
  }

  if (quantity < 1 || !Number.isInteger(quantity)) {
    return {
      success: false,
      status: 400,
      message: "Quantity must be a positive integer",
    };
  }

  await connectToDatabase();

  // 1. Query student profile
  const student = await User.findById(studentId).select("name email matricNumber role").lean();
  if (!student) {
    return {
      success: false,
      status: 404,
      message: "Student account not found in database",
    };
  }

  if (student.role !== USER_ROLES.STUDENT) {
    return {
      success: false,
      status: 403,
      message: "Only registered students can reserve student event tickets",
    };
  }

  // 2. Query event
  const event = await Event.findById(eventId);
  if (!event) {
    return {
      success: false,
      status: 404,
      message: "Event not found",
    };
  }

  // 3. Verify event publication status and timeline
  if (event.status !== EVENT_STATUS.PUBLISHED) {
    return {
      success: false,
      status: 400,
      message: "Registration is only open for published events",
    };
  }

  if (new Date(event.endDate) < new Date()) {
    return {
      success: false,
      status: 400,
      message: "This event has already ended",
    };
  }

  // 4. Find requested ticket tier
  const targetTierObjectId = new mongoose.Types.ObjectId(ticketTierId);
  const tier = event.ticketTiers.find((t) => t._id && t._id.equals(targetTierObjectId));

  if (!tier) {
    return {
      success: false,
      status: 404,
      message: "Selected ticket tier does not exist for this event",
    };
  }

  // 5. Verify ticket tier is genuinely free (defense against pricing tampering)
  const isFreeTier = event.isFree || tier.price === 0;
  if (!isFreeTier) {
    return {
      success: false,
      status: 400,
      message: "This ticket tier requires payment. Paid checkout will be activated in the next phase.",
    };
  }

  // 6. Check max per order
  const maxPerOrder = tier.maxPerOrder || 5;
  if (quantity > maxPerOrder) {
    return {
      success: false,
      status: 400,
      message: `Requested quantity exceeds the maximum limit of ${maxPerOrder} tickets per order for this tier`,
    };
  }

  // 7. Concurrency Protection & Atomic Capacity Decrement with Transaction
  const bookingReference = generateBookingReference();
  let bookingDoc: IBookingDocument | null = null;
  const createdTickets: ITicketDocument[] = [];

  let transactionExecuted = false;
  try {
    const mongoSession = await mongoose.startSession();
    try {
      await mongoSession.withTransaction(async () => {
        // A. Acquire write lock on student document to serialize concurrent requests from the same student
        const lockedStudent = await User.findOneAndUpdate(
          { _id: student._id },
          { $set: { updatedAt: new Date() } },
          { session: mongoSession }
        );

        if (!lockedStudent) {
          throw new Error("STUDENT_NOT_FOUND");
        }

        // B. Check existing bookings inside the transaction snapshot
        const existingBookings = await Booking.find(
          {
            userId: student._id,
            eventId: event._id,
            paymentStatus: "successful",
          },
          null,
          { session: mongoSession }
        );

        const alreadyBookedCount = existingBookings.reduce((sum, b) => sum + b.quantity, 0);
        if (alreadyBookedCount + quantity > maxPerOrder) {
          throw new Error(`MAX_PER_ORDER_EXCEEDED:${alreadyBookedCount}`);
        }

        // C. Atomic decrement on Event with condition available >= quantity
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

        // D. Create Booking document
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

        // E. Create individual Ticket documents
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

    if (err.message.startsWith("MAX_PER_ORDER_EXCEEDED")) {
      const bookedCount = err.message.split(":")[1] || "some";
      return {
        success: false,
        status: 400,
        message: `You have already registered for ${bookedCount} ticket(s) for this event. The maximum allowed per student is ${maxPerOrder}.`,
      };
    }

    if (err.message === "CAPACITY_EXCEEDED") {
      return {
        success: false,
        status: 409,
        message: "Sorry, this ticket tier is sold out or insufficient spots remain.",
      };
    }

    // Fallback if transactions are unsupported in standalone test environments
    if (!transactionExecuted) {
      console.warn("⚠️ Transaction not supported, executing atomic decrement with compensating rollback fallback.");

      // Check existing bookings
      const existingBookings = await Booking.find({
        userId: student._id,
        eventId: event._id,
        paymentStatus: "successful",
      });

      const alreadyBookedCount = existingBookings.reduce((sum, b) => sum + b.quantity, 0);
      if (alreadyBookedCount + quantity > maxPerOrder) {
        return {
          success: false,
          status: 400,
          message: `You have already registered for ${alreadyBookedCount} ticket(s) for this event. The maximum allowed per student is ${maxPerOrder}.`,
        };
      }

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
        return {
          success: false,
          status: 409,
          message: "Sorry, this ticket tier is sold out or insufficient spots remain.",
        };
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

  return {
    success: true,
    status: 201,
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
  };
}
