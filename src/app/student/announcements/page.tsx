import React from "react";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { StudentAnnouncementsClient } from "@/components/student/StudentAnnouncementsClient";

export const metadata = {
  title: "Campus Announcements & Bulletins — NOTARI 2.0",
  description: "Browse official university announcements, academic updates, and campus bulletins on NOTARI OAU.",
};

export default async function StudentAnnouncementsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string })?.role;
  if (role !== USER_ROLES.STUDENT && role !== USER_ROLES.ADMIN && role !== USER_ROLES.ORGANIZER) {
    redirect("/login");
  }

  return <StudentAnnouncementsClient />;
}
