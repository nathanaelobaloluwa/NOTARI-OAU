import React from "react";
import { Metadata } from "next";
import { OrganizerApplyClient } from "@/components/student/OrganizerApplyClient";

export const metadata: Metadata = {
  title: "Apply to Become an Organizer | NOTARI 2.0",
  description: "Apply for event organizer accreditation at Obafemi Awolowo University (Great Ife).",
};

export default function OrganizerApplyPage() {
  return <OrganizerApplyClient />;
}

