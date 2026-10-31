import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { getStudentHistory, StudentHistoryItem, HistoryCounts } from "@/lib/student/service";
import { StudentHistoryClient } from "@/components/student/StudentHistoryClient";

export const metadata = {
  title: "Event Booking & Attendance History | NOTARI Student Portal",
  description: "View your verified campus event attendance, digital passes, and booking records on NOTARI 2.0.",
};

export default async function StudentHistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/student/history");
  }

  const role = (session.user as { role?: string }).role;
  if (role !== USER_ROLES.STUDENT) {
    if (role === USER_ROLES.ADMIN) {
      redirect("/admin");
    } else if (role === USER_ROLES.ORGANIZER) {
      redirect("/organizer");
    } else {
      redirect("/login");
    }
  }

  const result = await getStudentHistory(session.user.id, "all");
  const data = result.data as {
    items: StudentHistoryItem[];
    counts: HistoryCounts;
  };

  return (
    <StudentHistoryClient
      initialItems={data?.items || []}
      counts={data?.counts || { all: 0, upcoming: 0, attended: 0, past: 0 }}
    />
  );
}
