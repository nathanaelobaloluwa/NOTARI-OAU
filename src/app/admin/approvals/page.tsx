import React from "react";
import { Metadata } from "next";
import { AdminApprovalsClient } from "@/components/admin/AdminApprovalsClient";

export const metadata: Metadata = {
  title: "Approvals Queue | NOTARI 2.0 Superadmin",
  description: "Review organizer accreditation requests and campus event submissions.",
};

export default function AdminApprovalsPage() {
  return <AdminApprovalsClient />;
}
