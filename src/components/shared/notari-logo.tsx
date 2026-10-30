import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotariLogoProps {
  variant?: "public" | "admin" | "student" | "organizer" | "auth";
  isDark?: boolean;
  className?: string;
}

export function NotariLogo({ variant = "public", isDark = false, className }: NotariLogoProps) {
  const subtitles: Record<string, string> = {
    public: "OAU Event Platform",
    admin: "OAU Administration",
    student: "Student Dashboard",
    organizer: "Organizer Dashboard",
    auth: "OAU Event Platform",
  };

  const href =
    variant === "admin"
      ? "/admin"
      : variant === "student"
      ? "/student"
      : variant === "organizer"
      ? "/organizer"
      : "/";

  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 group select-none", className)}>
      {/* Crest Shield Icon */}
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-md shadow-indigo-500/20 ring-2 ring-white/10 group-hover:scale-105 transition-transform duration-200">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-amber-400"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "text-xl font-bold tracking-tight font-sans transition-colors",
            isDark ? "text-white" : "text-notari-dark group-hover:text-notari-primary"
          )}
        >
          NOTARI
        </span>
        <span
          className={cn(
            "text-[10px] font-medium tracking-wider uppercase mt-0.5",
            isDark ? "text-slate-400" : "text-slate-500"
          )}
        >
          {subtitles[variant]}
        </span>
      </div>
    </Link>
  );
}
