import React, { Suspense } from "react";
import { Metadata } from "next";
import { AdminApprovalsHubClient } from "@/components/admin/AdminApprovalsHubClient";
import { RefreshCw } from "lucide-react";

export const metadata: Metadata = {
  title: "Approvals Queue | NOTARI 2.0 Superadmin",
  description: "Review organizer accreditation requests and campus event submissions.",
};

export default function AdminApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      }
    >
      <AdminApprovalsHubClient />
    </Suspense>
  );
}
