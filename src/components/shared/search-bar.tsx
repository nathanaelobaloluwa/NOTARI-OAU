"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  className?: string;
}

export function SearchBar({
  placeholder = "Search events, users, organizers, or anything...",
  value,
  onChange,
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative flex items-center w-full max-w-lg", className)}>
      <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-notari-dark placeholder:text-slate-400 focus:bg-white focus:border-notari-primary focus:outline-none focus:ring-2 focus:ring-notari-primary/10 transition-all"
      />
    </div>
  );
}
