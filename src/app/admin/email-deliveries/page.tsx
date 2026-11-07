import React from "react";
import { AdminEmailDeliveriesClient } from "@/components/admin/AdminEmailDeliveriesClient";

export const metadata = {
  title: "Transactional Email Deliveries | NOTARI Admin",
  description: "Monitor and audit transactional email deliveries, failure traces, and retry status.",
};

export default function AdminEmailDeliveriesPage() {
  return <AdminEmailDeliveriesClient />;
}
