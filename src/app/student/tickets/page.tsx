import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/database/mongoose";
import { Ticket } from "@/models";
import { USER_ROLES } from "@/constants/roles";
import { StudentTicketsClient, SerializedStudentTicket } from "@/components/tickets/StudentTicketsClient";

interface PopulatedTicketLean {
  _id: { toString(): string };
  bookingId?: { toString(): string };
  eventId?: {
    _id?: { toString(): string };
    title?: string;
    slug?: string;
    venue?: string;
    startDate?: Date;
    endDate?: Date;
    category?: string;
    flyerUrl?: string;
    organizerName?: string;
    toString?(): string;
  } | null;
  ticketCode: string;
  tierName: string;
  attendeeName: string;
  attendeeEmail: string;
  pricePaid: number;
  isCheckedIn: boolean;
  checkedInAt?: Date;
  qrCodeUrl?: string;
  createdAt?: Date;
}

export default async function StudentTicketsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/student/tickets");
  }

  const role = (session.user as { role?: string }).role;
  if (role !== USER_ROLES.STUDENT) {
    if (role === USER_ROLES.ADMIN) {
      redirect("/admin");
    } else if (role === USER_ROLES.ORGANIZER) {
      redirect("/organizer");
    } else {
      redirect("/login");
    }
  }

  await connectToDatabase();

  const tickets = (await Ticket.find({ userId: session.user.id })
    .populate({
      path: "eventId",
      select: "title slug venue startDate endDate flyerUrl category organizerName",
    })
    .sort({ createdAt: -1 })
    .lean()) as unknown as PopulatedTicketLean[];

  const serializedTickets: SerializedStudentTicket[] = tickets.map((t) => ({
    id: t._id.toString(),
    bookingId: t.bookingId ? t.bookingId.toString() : "",
    eventId: t.eventId ? (t.eventId._id ? t.eventId._id.toString() : String(t.eventId)) : "",
    ticketCode: t.ticketCode,
    tierName: t.tierName,
    attendeeName: t.attendeeName,
    attendeeEmail: t.attendeeEmail,
    pricePaid: t.pricePaid,
    isCheckedIn: Boolean(t.isCheckedIn),
    checkedInAt: t.checkedInAt ? new Date(t.checkedInAt).toISOString() : undefined,
    qrCodeUrl: t.qrCodeUrl,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    event:
      t.eventId && typeof t.eventId === "object" && t.eventId.title
        ? {
            id: t.eventId._id ? t.eventId._id.toString() : "",
            title: t.eventId.title,
            slug: t.eventId.slug || "",
            venue: t.eventId.venue || "",
            startDate: t.eventId.startDate ? new Date(t.eventId.startDate).toISOString() : "",
            endDate: t.eventId.endDate ? new Date(t.eventId.endDate).toISOString() : "",
            category: t.eventId.category || "",
            flyerUrl: t.eventId.flyerUrl,
            organizerName: t.eventId.organizerName || "",
          }
        : null,
  }));

  return (
    <StudentTicketsClient
      tickets={serializedTickets}
      studentName={session.user.name || "Student"}
    />
  );
}
