import React from "react";
import { Metadata } from "next";
import dynamicImport from "next/dynamic";
import { NotariPageLoader } from "@/components/shared/notari-page-loader";

export const metadata: Metadata = {
  title: "Gate Check-in Operations | NOTARI 2.0",
  description: "Real-time camera QR scanning, fraud prevention, and attendee check-in management.",
};

export const dynamic = "force-dynamic";

const DynamicOrganizerCheckInClient = dynamicImport(
  () =>
    import("@/components/organizer/OrganizerCheckInClient").then(
      (mod) => mod.OrganizerCheckInClient
    ),
  {
    loading: () => (
      <div className="py-16">
        <NotariPageLoader
          title="Gate Check-In"
          subtitle="Initializing scanner console and check-in services..."
        />
      </div>
    ),
  }
);

export default function OrganizerCheckInPage() {
  return <DynamicOrganizerCheckInClient />;
}
