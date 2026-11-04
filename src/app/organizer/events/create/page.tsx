import React from "react";
import { Metadata } from "next";
import { OrganizerCreateEventClient } from "@/components/organizer/OrganizerCreateEventClient";

export const metadata: Metadata = {
  title: "Create Event | NOTARI 2.0 Organizer",
  description: "Create and submit a new campus event for review and ticketing at Obafemi Awolowo University.",
};

export default function OrganizerCreateEventPage() {
  return <OrganizerCreateEventClient />;
}
