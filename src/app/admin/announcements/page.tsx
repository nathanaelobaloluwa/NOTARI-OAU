import React from "react";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { AdminAnnouncementsClient } from "@/components/admin/AdminAnnouncementsClient";

export const metadata = {
  title: "Campus Announcements Management — NOTARI 2.0 Admin",
  description: "Publish and manage campus announcements and targeted student bulletins on NOTARI OAU.",
};

export default async function AdminAnnouncementsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string })?.role;
  if (role !== USER_ROLES.ADMIN) {
    redirect("/student");
  }

  return <AdminAnnouncementsClient />;
}
