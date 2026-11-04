"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AdminApprovalsClient } from "@/components/admin/AdminApprovalsClient";
import { AdminEventApprovalsClient } from "@/components/admin/AdminEventApprovalsClient";
import { UserCheck, CalendarCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminApprovalsHubClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "events" ? "events" : "organizers";
  const [activeTab, setActiveTab] = useState<"organizers" | "events">(initialTab);

  const handleTabChange = (tab: "organizers" | "events") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/admin/approvals?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Superadmin Approvals Queue
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Review and audit organizer accreditation applications and student event submissions across Obafemi Awolowo University.
        </p>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => handleTabChange("organizers")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all",
            activeTab === "organizers"
              ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <UserCheck className="w-4 h-4" />
          <span>Organizer Accreditations</span>
        </button>

        <button
          onClick={() => handleTabChange("events")}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all",
            activeTab === "events"
              ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          )}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Event Submissions</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "organizers" ? (
        <AdminApprovalsClient />
      ) : (
        <AdminEventApprovalsClient />
      )}
    </div>
  );
}

