import React from "react";
import { Metadata } from "next";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export const metadata: Metadata = {
  title: "Users & Access Control | NOTARI 2.0 Superadmin",
  description: "Manage university student, organizer, and administrator accounts and permissions.",
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
