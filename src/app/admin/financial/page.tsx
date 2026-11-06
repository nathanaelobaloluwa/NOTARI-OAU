import React from "react";
import { Metadata } from "next";
import { AdminFinancialClient } from "@/components/admin/AdminFinancialClient";

export const metadata: Metadata = {
  title: "Financial & Settlement Management | NOTARI Superadmin",
  description: "Platform-wide management of organizer bank payout accounts, withdrawal disbursements, and student refunds.",
};

export default function AdminFinancialPage() {
  return <AdminFinancialClient />;
}
