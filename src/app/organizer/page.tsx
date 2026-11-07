import React from "react";
import { Metadata } from "next";
import { OrganizerDashboardClient } from "@/components/organizer/OrganizerDashboardClient";

export const metadata: Metadata = {
  title: "Organizer Dashboard | NOTARI 2.0",
  description: "Monitor university event metrics, ticket volume, revenue, and attendee check-ins.",
};

export default function OrganizerDashboardPage() {
  return <OrganizerDashboardClient />;
}
