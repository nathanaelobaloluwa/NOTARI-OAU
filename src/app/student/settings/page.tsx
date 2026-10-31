import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { getStudentProfile, SanitizedStudentProfile } from "@/lib/student/service";
import { StudentSettingsClient } from "@/components/student/StudentSettingsClient";

export const metadata = {
  title: "Profile & Account Settings | NOTARI Student Portal",
  description: "Manage your personal university profile, matric details, and security credentials on NOTARI 2.0.",
};

export default async function StudentSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/student/settings");
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

  const result = await getStudentProfile(session.user.id);
  const profile = result.data as SanitizedStudentProfile;

  return <StudentSettingsClient initialProfile={profile} />;
}
