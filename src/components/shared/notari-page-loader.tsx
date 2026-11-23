import React from "react";
import { cn } from "@/lib/utils";
import { NotariSymbol } from "./notari-symbol";

export interface NotariPageLoaderProps {
  /**
   * Main heading message
   * Defaults to "NOTARI"
   */
  title?: string;

  /**
   * Status subtitle descriptor
   * Defaults to "Obafemi Awolowo University Event Platform"
   */
  subtitle?: string;

  /**
   * Whether to fix over the entire viewport
   * When false, fills the parent container cleanly
   */
  fullscreen?: boolean;

  /**
   * Dark theme background (Midnight Navy) vs Light (Cloud White)
   */
  isDark?: boolean;

  /**
   * Additional wrapper class
   */
  className?: string;
}

/**
 * NotariPageLoader
 * Full-page / view-level loading experience implementing the 4-step sequence:
 * 1. Symbol reveal (Great Ife crest)
 * 2. Wordmark fade-in (NOTARI)
 * 3. Subtle indeterminate progress bar (Electric Blue + Campus Teal)
 * 4. Smooth page transition without layout shift
 */
export function NotariPageLoader({
  title = "NOTARI",
  subtitle = "Obafemi Awolowo University Event Platform",
  fullscreen = false,
  isDark = false,
  className,
}: NotariPageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center p-6 select-none transition-colors",
        fullscreen
          ? "fixed inset-0 z-50 min-h-screen"
          : "w-full min-h-[380px] h-full flex-1",
        isDark ? "bg-[#151C35] text-white" : "bg-[#F4F6FA] text-[#151C35]",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center max-w-sm text-center">
        {/* Step 1: Symbol Reveal */}
        <div className="relative mb-5 animate-notari-reveal">
          {/* Subtle Ambient Glow */}
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-2xl pointer-events-none opacity-40",
              isDark ? "bg-[#4169E1]" : "bg-[#4169E1]/30"
            )}
          />
          <NotariSymbol size={64} showGlow animated />
        </div>

        {/* Step 2: Wordmark Fade-In */}
        <div className="space-y-1.5 animate-notari-reveal [animation-delay:120ms] opacity-0 [animation-fill-mode:forwards]">
          <h2
            className={cn(
              "text-2xl sm:text-3xl font-black font-sans tracking-[0.16em] uppercase",
              isDark ? "text-white" : "text-[#151C35]"
            )}
          >
            {title}
          </h2>
          <p
            className={cn(
              "text-[10px] sm:text-xs font-semibold tracking-[0.18em] uppercase",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {subtitle}
          </p>
        </div>

        {/* Step 3: Subtle Indeterminate Progress Bar */}
        <div className="w-48 sm:w-56 h-1 mt-7 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden relative">
          <div className="absolute top-0 bottom-0 bg-gradient-to-r from-[#4169E1] via-[#20BFA9] to-[#FBBF24] rounded-full animate-notari-indeterminate" />
        </div>

        <span className="sr-only">Loading {title}... Please wait.</span>
      </div>
    </div>
  );
}
