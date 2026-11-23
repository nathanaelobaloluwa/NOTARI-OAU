import React from "react";
import Link from "next/link";
import { NotariLogo } from "@/components/shared/notari-logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#151C35] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm text-center flex flex-col items-center">
        <NotariLogo layout="stacked" size="lg" className="mb-6" />

        <span className="text-5xl font-black text-[#4169E1] mb-2 tracking-tight">404</span>
        <h1 className="text-xl font-bold text-[#151C35] mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          The event, ticket, or campus page you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#4169E1] text-white font-medium text-sm hover:bg-[#3358C8] transition-colors shadow-sm"
          >
            Return Home
          </Link>
          <Link
            href="/events"
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  );
}
