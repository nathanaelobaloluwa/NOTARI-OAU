"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ShieldAlert, LayoutDashboard } from "lucide-react";

interface AdminPortalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminPortalError({ error, reset }: AdminPortalErrorProps) {
  useEffect(() => {
    console.error("🚨 [ADMIN_PORTAL_ERROR]:", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm flex flex-col items-center">
        <div className="p-4 bg-red-50 rounded-2xl mb-4 text-[#EF4444]" aria-hidden="true">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-[#151C35] mb-1">
          Administration Console
        </span>
        <h1 className="text-xl font-bold text-[#151C35] mb-2">
          Administrator Module Interrupted
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          An error occurred while compiling administration metrics or audit records. The database audit trail is protected.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#151C35] text-white font-semibold text-sm hover:bg-[#0D1224] transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4 shrink-0 text-[#20BFA9]" />
            <span>Retry Operation</span>
          </button>
          <Link
            href="/admin"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0 text-[#4169E1]" />
            <span>Admin Overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
