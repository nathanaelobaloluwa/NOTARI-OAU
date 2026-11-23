import React from "react";
import { cn } from "@/lib/utils";
import { NotariSymbol } from "./notari-symbol";

export type NotariLoaderSize = "xs" | "sm" | "md" | "lg" | "xl";
export type NotariLoaderVariant = "electric" | "teal" | "white" | "midnight";

export interface NotariLoaderProps {
  /**
   * Scale of the loader
   * - "xs": 16px micro-indicator (e.g. inside small tags or compact buttons)
   * - "sm": 20px button-level indicator (standard button replacement for Loader2)
   * - "md": 36px card or table section loader
   * - "lg": 52px modal or container loader
   * - "xl": 72px page or hero section loader
   */
  size?: NotariLoaderSize;

  /**
   * Color accent for the orbital spinner ring
   */
  variant?: NotariLoaderVariant;

  /**
   * Accessible status text for screen readers (defaults to "Loading...")
   */
  label?: string;

  /**
   * Optional visible text to display alongside the loader
   */
  text?: string;

  /**
   * Additional root container classes
   */
  className?: string;
}

const SIZE_MAP: Record<NotariLoaderSize, { icon: number; box: string; text: string }> = {
  xs: { icon: 16, box: "w-4 h-4", text: "text-xs" },
  sm: { icon: 20, box: "w-5 h-5", text: "text-xs" },
  md: { icon: 36, box: "w-9 h-9", text: "text-sm" },
  lg: { icon: 52, box: "w-13 h-13", text: "text-base" },
  xl: { icon: 72, box: "w-18 h-18", text: "text-lg" },
};

const VARIANT_COLORS: Record<NotariLoaderVariant, { ring: string; track: string; glow: string }> = {
  electric: {
    ring: "#4169E1",
    track: "rgba(65, 105, 225, 0.18)",
    glow: "rgba(65, 105, 225, 0.35)",
  },
  teal: {
    ring: "#20BFA9",
    track: "rgba(32, 191, 169, 0.18)",
    glow: "rgba(32, 191, 169, 0.4)",
  },
  white: {
    ring: "#FFFFFF",
    track: "rgba(255, 255, 255, 0.25)",
    glow: "rgba(255, 255, 255, 0.3)",
  },
  midnight: {
    ring: "#151C35",
    track: "rgba(21, 28, 53, 0.15)",
    glow: "rgba(21, 28, 53, 0.2)",
  },
};

/**
 * NotariLoader
 * Premium, lightweight SVG animated loader with OAU university crest aesthetics.
 * Pure SVG + CSS keyframes with 0 runtime dependencies and reduced-motion support.
 */
export function NotariLoader({
  size = "sm",
  variant = "electric",
  label = "Loading...",
  text,
  className,
}: NotariLoaderProps) {
  const { icon: pxSize, box, text: textSize } = SIZE_MAP[size];
  const colors = VARIANT_COLORS[variant];

  // For compact buttons (xs, sm), render a high-performance circular shield crest spinner
  if (size === "xs" || size === "sm") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn("inline-flex items-center gap-2 select-none shrink-0", className)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("animate-spin shrink-0", box)}
          style={{ width: `${pxSize}px`, height: `${pxSize}px` }}
          aria-hidden="true"
        >
          {/* Subtle static background track */}
          <circle
            cx="12"
            cy="12"
            r="9.5"
            stroke={colors.track}
            strokeWidth="2.5"
          />
          {/* Dynamic rotating arc */}
          <path
            d="M12 2.5 A9.5 9.5 0 0 1 21.5 12"
            stroke={colors.ring}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Central university shield dot */}
          <path
            d="M12 8 L14 9.5 C14 12 13 14 12 15 C11 14 10 12 10 9.5 Z"
            fill={colors.ring}
            opacity="0.9"
          />
        </svg>

        {text && <span className={cn("font-medium", textSize)}>{text}</span>}
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  // For larger containers (md, lg, xl), render the NOTARI Crest with orbital sweep & pulse
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 select-none", className)}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: `${pxSize}px`, height: `${Math.round(pxSize * 1.15)}px` }}
      >
        {/* Ambient Outer Halo */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40 pointer-events-none animate-notari-pulse"
          style={{ backgroundColor: colors.glow }}
        />

        {/* Orbiting Ring around the Crest */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-[-15%] w-[130%] h-[130%] pointer-events-none animate-spin"
          style={{ animationDuration: "2.8s" }}
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={colors.track}
            strokeWidth="2"
          />
          <path
            d="M50 6 A44 44 0 0 1 94 50"
            fill="none"
            stroke={colors.ring}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="94" cy="50" r="3.5" fill={variant === "electric" ? "#20BFA9" : "#FBBF24"} />
        </svg>

        {/* Central Notari University Crest */}
        <NotariSymbol size={pxSize} animated />
      </div>

      {text && (
        <span className={cn("font-medium text-slate-600 animate-pulse tracking-wide", textSize)}>
          {text}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
