import React from "react";
import { Metadata } from "next";
import { AdminBookingsClient } from "@/components/admin/AdminBookingsClient";

export const metadata: Metadata = {
  title: "Bookings & Transactions Ledger | NOTARI Superadmin",
  description: "Platform-wide ledger of campus bookings, Paystack payment transactions, and admissions.",
};

export default function AdminBookingsPage() {
  return <AdminBookingsClient />;
}
