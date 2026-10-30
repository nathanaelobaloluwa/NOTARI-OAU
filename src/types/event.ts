import { EventCategory, EventStatus } from "@/constants/oau";

export interface ITicketTier {
  id: string;
  name: string; // e.g. "General Admission", "VIP", "Student"
  price: number; // In NGN (0 for free)
  capacity: number;
  available: number;
  description?: string;
  maxPerOrder?: number;
}

export interface IEvent {
  _id: string;
  title: string;
  slug: string;
  description: string;
  organizerId: string;
  organizerName: string;
  category: EventCategory;
  faculty?: string;
  venue: string;
  address?: string;
  startDate: string;
  endDate: string;
  flyerUrl?: string;
  galleryUrls?: string[];
  isFree: boolean;
  ticketTiers: ITicketTier[];
  totalCapacity: number;
  registeredCount: number;
  status: EventStatus;
  isFeatured?: boolean;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
