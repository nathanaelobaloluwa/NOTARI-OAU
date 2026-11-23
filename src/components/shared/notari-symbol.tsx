import React from "react";
import { cn } from "@/lib/utils";

export interface NotariSymbolProps {
  className?: string;
  size?: number | string;
  showGlow?: boolean;
  animated?: boolean;
  /**
   * Color variant:
   * - "brand": Multi-facet gradient with site colors (Electric Blue, Campus Teal, Midnight Navy, Gold apex)
   * - "white": Pure high-contrast white silhouette (authentic to user's uploaded art)
   * - "dark": Deep Midnight Navy / slate silhouette for subtle watermarks
   */
  variant?: "brand" | "white" | "dark";
  /**
   * Whether to wrap the monogram in a rounded Midnight Navy squircle badge
   * Ideal for high-contrast presentation on white/light surfaces
   */
  showBadge?: boolean;
}

/**
 * Official NOTARI 2.0 Monogram Geometry
 * Mathematically derived from the user's authentic emblem:
 * - 180° rotational symmetry around center (50, 69)
 * - 45° angle precision cuts across all diagonal facets and slots
 * - 3 architectural pillars: Left Foundation, Dynamic Center Bridge, Right Ascension
 */
export const NOTARI_MONOGRAM_PATH =
  "M0,0 L95,93 L95,66 L71,39 L72,0 L100,37 L100,138 L5,45 L5,72 L29,99 L28,138 L0,101 Z";

export function NotariSymbol({
  className,
  size = 40,
  showGlow = false,
  animated = false,
  variant = "brand",
  showBadge = false,
}: NotariSymbolProps) {
  const uniqueId = React.useId().replace(/:/g, "");

  const numericSize = typeof size === "number" ? size : 40;
  const computedHeight = typeof size === "number" ? Math.round(numericSize * 1.38) : undefined;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none",
        showBadge ? "aspect-square" : "aspect-[100/138]",
        showBadge && "bg-[#151C35] rounded-2xl border border-[#4169E1]/30 p-2 shadow-lg shadow-[#151C35]/30",
        showGlow && !showBadge && "filter drop-shadow-[0_4px_16px_rgba(65,105,225,0.4)]",
        className
      )}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: showBadge ? (typeof size === "number" ? `${size}px` : size) : computedHeight ? `${computedHeight}px` : undefined,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox={showBadge ? "-14 -14 128 166" : "-6 -6 112 150"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-full h-full overflow-visible",
          animated && "animate-notari-pulse"
        )}
      >
        <defs>
          {/* Primary Brand Gradient: Electric Blue (#4169E1) -> Campus Teal (#20BFA9) */}
          <linearGradient id={`brandGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4169E1" />
            <stop offset="35%" stopColor="#3B82F6" />
            <stop offset="70%" stopColor="#20BFA9" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>

          {/* Dynamic Architectural Sheen & Depth Layer */}
          <linearGradient id={`sheenGrad-${uniqueId}`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="60%" stopColor="#20BFA9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>

          {/* Academic Radiance Apex Spark (Knowledge & Discovery at Great Ife) */}
          <radialGradient id={`apexGold-${uniqueId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#FDE68A" />
            <stop offset="80%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Ambient Lighting Glow */}
          <filter id={`ambientGlow-${uniqueId}`} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#4169E1" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* 1. Ambient Glow Layer (when showGlow is enabled) */}
        {showGlow && (
          <path
            d={NOTARI_MONOGRAM_PATH}
            fill="#4169E1"
            filter={`url(#ambientGlow-${uniqueId})`}
            opacity="0.65"
          />
        )}

        {/* 2. Core Geometric N Monogram Silhouette */}
        <g id="notari-monogram-core">
          <path
            d={NOTARI_MONOGRAM_PATH}
            fill={
              variant === "brand"
                ? `url(#brandGrad-${uniqueId})`
                : variant === "white"
                ? "#FFFFFF"
                : "#151C35"
            }
          />
        </g>

        {/* 3. Multi-Faceted Architectural Sheen & Depth Overlay */}
        {variant === "brand" && (
          <g id="notari-brand-facets" opacity="0.9">
            {/* Top-to-bottom depth sheen */}
            <path
              d={NOTARI_MONOGRAM_PATH}
              fill={`url(#sheenGrad-${uniqueId})`}
            />

            {/* Polished Chamfer Edges (45-degree light reflections) */}
            <path
              d="M0,0 L95,93"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M5,45 L100,138"
              stroke="#20BFA9"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M72,0 L100,37"
              stroke="#FDE68A"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.85"
            />
            <path
              d="M0,101 L28,138"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* Academic Beacon: Glowing Gold Vertex Spark at Apex (72, 0) */}
            <g id="academic-beacon">
              <circle cx="72" cy="2" r="6" fill={`url(#apexGold-${uniqueId})`} />
              <circle cx="72" cy="2" r="2.2" fill="#FFFFFF" />
            </g>
          </g>
        )}

        {/* Subtle Chamfer Highlight for White Variant */}
        {variant === "white" && (
          <g id="notari-white-facets" opacity="0.4">
            <path
              d="M0,0 L95,93"
              stroke="#151C35"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.25"
            />
            <path
              d="M5,45 L100,138"
              stroke="#151C35"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.25"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
