import React from "react";
import { OrganizerPortalShell } from "@/components/organizer/organizer-portal-shell";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NotariLogo } from "@/components/shared/notari-logo";

/**
 * NOTARI Organizer Portal Layout
 * Wraps all organizer management routes inside the authenticated OrganizerPortalShell.
 * Renders <NotariLogo variant="organizer" /> in the navigation sidebar.
 */
export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizerPortalShell>{children}</OrganizerPortalShell>;
}
