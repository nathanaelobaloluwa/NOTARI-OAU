import React from "react";
import { Metadata } from "next";
import { OrganizerEventsListClient } from "@/components/organizer/OrganizerEventsListClient";

export const metadata: Metadata = {
  title: "My Events | NOTARI 2.0 Organizer",
  description: "Manage your submitted, published, and draft OAU university events.",
};

export default function OrganizerEventsListPage() {
  return <OrganizerEventsListClient />;
}
