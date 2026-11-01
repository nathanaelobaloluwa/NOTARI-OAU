import React from "react";
import { Metadata } from "next";
import { OrganizerProfileClient } from "@/components/organizer/OrganizerProfileClient";

export const metadata: Metadata = {
  title: "Organization Profile | NOTARI 2.0",
  description: "Manage official organizer profile and contact details at Obafemi Awolowo University.",
};

export default function OrganizerProfilePage() {
  return <OrganizerProfileClient />;
}
