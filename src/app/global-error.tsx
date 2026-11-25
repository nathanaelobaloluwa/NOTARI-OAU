"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { NotariLogo } from "@/components/shared/notari-logo";
import { RotateCcw, Home, AlertOctagon } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("🚨 [NOTARI_GLOBAL_ERROR]:", {
      message: error?.message,
      digest: error?.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const incidentCode = error?.digest ? `CRIT-${error.digest.slice(0, 8).toUpperCase()}` : "NOTARI-CRIT-ERR";

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#151C35] text-white flex flex-col items-center justify-center p-4 m-0 font-sans antialiased">
        <main
          role="main"
          className="max-w-md w-full bg-[#10162B] border border-white/10 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center"
        >
          {/* Brand Emblem */}
          <div className="mb-6">
            <NotariLogo layout="stacked" size="lg" isDark showGlow href="/" />
          </div>

          {/* Critical Error Icon */}
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 text-[#EF4444]" aria-hidden="true">
            <AlertOctagon className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">System Interruption</h1>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            NOTARI encountered a critical system interruption. Your session and data are secure.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-400 mb-6 select-all">
            <span>Reference:</span>
            <span className="font-semibold text-slate-200">{incidentCode}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4169E1] text-white font-semibold text-sm hover:bg-[#3358C8] transition-colors"
            >
              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Retry Session</span>
            </button>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors border border-white/10"
            >
              <Home className="w-4 h-4 shrink-0 text-[#20BFA9]" aria-hidden="true" />
              <span>Go Home</span>
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
