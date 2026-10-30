export interface ITicket {
  _id: string;
  bookingId: string;
  eventId: string;
  userId: string;
  ticketTierId: string;
  tierName: string;
  ticketCode: string; // Unique alphanumeric code
  qrCodeUrl?: string;
  attendeeName: string;
  attendeeEmail: string;
  pricePaid: number;
  isCheckedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  createdAt: string;
}

export interface IBooking {
  _id: string;
  bookingReference: string; // e.g. "NOT-2025-XXXXX"
  userId: string;
  eventId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: "pending" | "successful" | "failed" | "refunded";
  paymentReference?: string;
  paymentChannel?: "paystack" | "free";
  paidAt?: string;
  tickets: ITicket[];
  createdAt: string;
  updatedAt: string;
}
