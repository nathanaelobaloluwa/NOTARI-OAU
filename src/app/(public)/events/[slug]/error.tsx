"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ArrowLeft, AlertCircle } from "lucide-react";

interface EventDetailErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EventDetailError({ error, reset }: EventDetailErrorProps) {
  useEffect(() => {
    console.error("🚨 [EVENT_DETAIL_ERROR]:", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center">
        <div className="p-4 bg-red-50 rounded-2xl mb-4 text-[#EF4444]" aria-hidden="true">
          <AlertCircle className="w-10 h-10" />
        </div>

        <h1 className="text-xl font-bold text-[#151C35] mb-2">
          Unable to Load Event Details
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          An error occurred while loading this campus event. Please try refreshing or check back in a few moments.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4169E1] text-white font-semibold text-sm hover:bg-[#3358C8] transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Try Again</span>
          </button>
          <Link
            href="/events"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Events</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
