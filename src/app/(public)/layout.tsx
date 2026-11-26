import React from "react";
import { auth } from "@/lib/auth/auth";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { StudentPortalShell } from "@/components/student/student-portal-shell";
import { OrganizerPortalShell } from "@/components/organizer/organizer-portal-shell";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { USER_ROLES } from "@/constants/roles";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1. Unauthenticated Visitors: Render genuine public marketing website layout
  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col bg-notari-bg text-notari-dark">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    );
  }

  // 2. Authenticated Users: Route to appropriate authenticated portal shell
  const role = (session.user as { role?: string })?.role;
  const isOrganizer = Boolean(
    (session.user as { isOrganizer?: boolean })?.isOrganizer || role === USER_ROLES.ORGANIZER
  );

  if (role === USER_ROLES.ADMIN) {
    return <AdminPortalShell>{children}</AdminPortalShell>;
  }

  if (isOrganizer) {
    return <OrganizerPortalShell>{children}</OrganizerPortalShell>;
  }

  // Default: Student Portal Experience
  return <StudentPortalShell>{children}</StudentPortalShell>;
}
