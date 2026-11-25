import React from "react";
import Link from "next/link";
import { NotariLogo } from "@/components/shared/notari-logo";
import { NotariSymbol } from "@/components/shared/notari-symbol";
import { Home, Calendar, Ticket } from "lucide-react";

export const metadata = {
  title: "404 - Page Not Found | NOTARI OAU",
  description: "The page or event you are looking for does not exist on NOTARI.",
};

export default function NotFound() {
  return (
    <main
      role="main"
      className="min-h-screen bg-gradient-to-b from-[#151C35] via-[#10162B] to-[#0A0E1D] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Ambient background glow accents */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4169E1]/15 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#20BFA9]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-xl w-full bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl text-center flex flex-col items-center relative z-10">
        {/* Brand Monogram Header */}
        <div className="mb-6">
          <NotariLogo
            layout="stacked"
            size="lg"
            isDark
            showGlow
            href="/"
            className="hover:opacity-95 transition-opacity"
          />
        </div>

        {/* 404 Visual Indicator */}
        <div className="relative mb-4 flex items-center justify-center select-none" aria-hidden="true">
          <span className="text-7xl sm:text-9xl font-black tracking-tight text-white/10 font-mono">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-3 bg-[#4169E1]/20 border border-[#4169E1]/40 rounded-2xl shadow-lg shadow-[#4169E1]/20 backdrop-blur-md">
              <NotariSymbol size={44} variant="brand" showGlow />
            </div>
          </div>
        </div>

        {/* Heading & Contextual Copy */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-md">
          This event, ticket pass, or campus page seems to have wandered off the schedule. It may have been moved, renamed, or concluded.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mb-8">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#4169E1] text-white font-semibold text-sm hover:bg-[#3358C8] active:scale-[0.98] transition-all shadow-lg shadow-[#4169E1]/25 focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:ring-offset-2 focus:ring-offset-[#151C35]"
          >
            <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Return Home</span>
          </Link>
          <Link
            href="/events"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 active:scale-[0.98] transition-all border border-white/15 focus:outline-none focus:ring-2 focus:ring-[#20BFA9] focus:ring-offset-2 focus:ring-offset-[#151C35]"
          >
            <Calendar className="w-4 h-4 shrink-0 text-[#20BFA9]" aria-hidden="true" />
            <span>Explore Events</span>
          </Link>
        </div>

        {/* Helpful Campus Quick Links */}
        <div className="w-full pt-6 border-t border-white/10">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
            Helpful Campus Destinations
          </p>
          <nav aria-label="Helpful campus links" className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
            <Link
              href="/student/tickets"
              className="inline-flex items-center gap-1.5 hover:text-[#4169E1] transition-colors py-1 px-2 rounded-md hover:bg-white/5"
            >
              <Ticket className="w-3.5 h-3.5 text-[#20BFA9]" aria-hidden="true" />
              <span>My Ticket Passes</span>
            </Link>
            <Link
              href="/student/announcements"
              className="hover:text-[#4169E1] transition-colors py-1 px-2 rounded-md hover:bg-white/5"
            >
              Campus Announcements
            </Link>
            <Link
              href="/about"
              className="hover:text-[#4169E1] transition-colors py-1 px-2 rounded-md hover:bg-white/5"
            >
              About NOTARI OAU
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
