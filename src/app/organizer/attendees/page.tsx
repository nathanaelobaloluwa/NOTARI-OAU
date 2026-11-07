import React from "react";
import { Metadata } from "next";
import { OrganizerAttendeesClient } from "@/components/organizer/OrganizerAttendeesClient";

export const metadata: Metadata = {
  title: "Event Attendees | NOTARI 2.0 Organizer",
  description: "View registered students, matriculation details, gate check-in status, and export attendee rosters.",
};

export default function OrganizerAttendeesPage() {
  return <OrganizerAttendeesClient />;
}
