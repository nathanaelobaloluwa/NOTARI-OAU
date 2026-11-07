import React from "react";
import { Metadata } from "next";
import { OrganizerTicketTiersClient } from "@/components/organizer/OrganizerTicketTiersClient";

export const metadata: Metadata = {
  title: "Ticket Tiers & Pricing | NOTARI 2.0 Organizer",
  description: "Configure admission categories, price levels, and ticket capacities across your OAU events.",
};

export default function OrganizerTicketTiersPage() {
  return <OrganizerTicketTiersClient />;
}
