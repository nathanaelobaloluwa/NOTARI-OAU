import React from "react";
import { Metadata } from "next";
import { OrganizerPayoutsClient } from "@/components/organizer/OrganizerPayoutsClient";

export const metadata: Metadata = {
  title: "Revenue & Payouts | NOTARI 2.0 Organizer",
  description: "Track ticket proceeds, ledger balances, and settlement accounting for your events.",
};

export default function OrganizerPayoutsPage() {
  return <OrganizerPayoutsClient />;
}
