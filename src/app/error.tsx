"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { NotariLogo } from "@/components/shared/notari-logo";
import { RotateCcw, Home, LifeBuoy, AlertTriangle } from "lucide-react";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    // Log unexpected errors securely without leaking to user screen
    console.error("🚨 [NOTARI_ROOT_ERROR]:", {
      message: error?.message,
      digest: error?.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const incidentCode = error?.digest ? `ERR-${error.digest.slice(0, 8).toUpperCase()}` : "NOTARI-ERR-500";

  return (
    <main
      role="main"
      className="min-h-screen bg-gradient-to-b from-[#151C35] via-[#10162B] to-[#0A0E1D] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Ambient background glow accents */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#EF4444]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#4169E1]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-xl w-full bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl text-center flex flex-col items-center relative z-10">
        {/* Brand Header */}
        <div className="mb-6">
          <NotariLogo layout="stacked" size="lg" isDark showGlow href="/" />
        </div>

        {/* Warning Badge Icon */}
        <div className="relative mb-4 flex items-center justify-center" aria-hidden="true">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl shadow-lg shadow-red-500/10">
            <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
          </div>
        </div>

        {/* Reassuring Headings & Copy */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
          Something Went Wrong
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-md">
          NOTARI couldn&apos;t complete your request due to an unexpected system interruption. Your data and account remain safe.
        </p>

        {/* Incident Reference Indicator (No Stack Trace) */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-400 mb-8 select-all">
          <span>Incident Reference:</span>
          <span className="font-semibold text-slate-200">{incidentCode}</span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mb-8">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#4169E1] text-white font-semibold text-sm hover:bg-[#3358C8] active:scale-[0.98] transition-all shadow-lg shadow-[#4169E1]/25 focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:ring-offset-2 focus:ring-offset-[#151C35]"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 active:scale-[0.98] transition-all border border-white/15 focus:outline-none focus:ring-2 focus:ring-[#20BFA9] focus:ring-offset-2 focus:ring-offset-[#151C35]"
          >
            <Home className="w-4 h-4 shrink-0 text-[#20BFA9]" aria-hidden="true" />
            <span>Return Home</span>
          </Link>
        </div>

        {/* Support Help Route */}
        <div className="w-full pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LifeBuoy className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span>Need help? Contact the NOTARI Campus Support desk or check our status.</span>
        </div>
      </div>
    </main>
  );
}
