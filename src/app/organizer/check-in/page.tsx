import React from "react";
import { Metadata } from "next";
import { OrganizerCheckInClient } from "@/components/organizer/OrganizerCheckInClient";

export const metadata: Metadata = {
  title: "Gate Check-in Operations | NOTARI 2.0",
  description: "Real-time camera QR scanning, fraud prevention, and attendee check-in management.",
};

export const dynamic = "force-dynamic";

export default function OrganizerCheckInPage() {
  return <OrganizerCheckInClient />;
}
