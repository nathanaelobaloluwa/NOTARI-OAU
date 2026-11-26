import React from "react";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NotariLogo } from "@/components/shared/notari-logo";

/**
 * NOTARI Admin Portal Layout
 * Uses Midnight Navy #151C35 sidebar styling and renders <NotariLogo variant="admin" isDark />.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminPortalShell>{children}</AdminPortalShell>;
}
