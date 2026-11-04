import React from "react";
import { Metadata } from "next";
import { OrganizerEventDetailClient } from "@/components/organizer/OrganizerEventDetailClient";

export const metadata: Metadata = {
  title: "Manage Event | NOTARI 2.0 Organizer",
  description: "View and manage your OAU campus event details, ticketing, and review status.",
};

interface EventManagePageProps {
  params: Promise<{ eventId: string }>;
}

export default async function OrganizerEventManagePage({ params }: EventManagePageProps) {
  const { eventId } = await params;
  return <OrganizerEventDetailClient eventId={eventId} />;
}
