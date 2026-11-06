import React from "react";
import { Metadata } from "next";
import { OrganizerOrdersClient } from "@/components/organizer/OrganizerOrdersClient";

export const metadata: Metadata = {
  title: "Orders & Transactions | NOTARI 2.0 Organizer",
  description: "View real-time verified ticket transactions and attendee orders for your campus events.",
};

export default function OrganizerOrdersPage() {
  return <OrganizerOrdersClient />;
}
