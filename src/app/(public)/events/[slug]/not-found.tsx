import React from "react";
import Link from "next/link";
import { Calendar, ArrowLeft, Search } from "lucide-react";

export default function EventNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col items-center">
        <div className="p-4 bg-[#EEF2FF] rounded-2xl mb-5 text-[#4169E1]">
          <Calendar className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-[#4169E1] mb-1">
          Event Not Found
        </span>
        <h1 className="text-2xl font-bold text-[#151C35] mb-2">
          This Event Is Not Available
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          The campus event you are looking for may have concluded, been rescheduled, or is no longer listed on NOTARI.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Link
            href="/events"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4169E1] text-white font-semibold text-sm hover:bg-[#3358C8] transition-colors shadow-sm"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Browse All Events</span>
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
