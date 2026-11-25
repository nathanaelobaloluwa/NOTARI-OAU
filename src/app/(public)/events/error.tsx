"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home, AlertCircle } from "lucide-react";

interface EventsDirectoryErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EventsDirectoryError({ error, reset }: EventsDirectoryErrorProps) {
  useEffect(() => {
    console.error("🚨 [EVENTS_DIRECTORY_ERROR]:", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center">
        <div className="p-4 bg-red-50 rounded-2xl mb-4 text-[#EF4444]" aria-hidden="true">
          <AlertCircle className="w-10 h-10" />
        </div>

        <h1 className="text-xl font-bold text-[#151C35] mb-2">
          Unable to Load Events Directory
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          We encountered an issue retrieving the campus event listings. You can retry loading or return to the home discovery feed.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4169E1] text-white font-semibold text-sm hover:bg-[#3358C8] transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Reload Events</span>
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            <Home className="w-4 h-4 shrink-0 text-[#20BFA9]" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
