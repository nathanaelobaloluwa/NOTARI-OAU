import React from "react";
import { Metadata } from "next";
import { OrganizerAnalyticsClient } from "@/components/organizer/OrganizerAnalyticsClient";

export const metadata: Metadata = {
  title: "Event Analytics & Insights | NOTARI 2.0 Organizer",
  description: "Monitor university event conversion rates, ticketing revenue, and attendee faculty demographics.",
};

export default function OrganizerAnalyticsPage() {
  return <OrganizerAnalyticsClient />;
}
