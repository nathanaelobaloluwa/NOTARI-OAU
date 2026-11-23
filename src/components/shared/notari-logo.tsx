import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotariSymbol } from "./notari-symbol";

export type NotariLogoVariant = "public" | "admin" | "student" | "organizer" | "auth";
export type NotariLogoLayout = "horizontal" | "stacked" | "symbol-only";
export type NotariLogoSize = "sm" | "md" | "lg" | "xl";

export interface NotariLogoProps {
  /**
   * Application portal or context variant
   * Determines default subtitle descriptor and target route
   */
  variant?: NotariLogoVariant;

  /**
   * Layout orientation of the logo
   * - "horizontal": Symbol on left, wordmark + subtitle on right (default)
   * - "stacked": Symbol centered above wordmark + subtitle
   * - "symbol-only": Standalone university crest symbol
   */
  layout?: NotariLayout;

  /**
   * Size scale
   * - "sm": Compact for mobile bars or small action cards (symbol 28px)
   * - "md": Standard header, sidebar, and navbar size (symbol 38px)
   * - "lg": Prominent modals and dashboard headers (symbol 48px)
   * - "xl": Auth splash, hero sections, and welcome banners (symbol 64px)
   */
  size?: NotariLogoSize;

  /**
   * Whether rendering on a dark background (inverts wordmark to white/silver)
   */
  isDark?: boolean;

  /**
   * Whether to display the role descriptor subtitle below NOTARI
   * Defaults to true unless layout is "symbol-only"
   */
  showSubtitle?: boolean;

  /**
   * Destination URL when clicked. Set to false to render a non-interactive <div>.
   */
  href?: string | false;

  /**
   * Additional root container class name
   */
  className?: string;

  /**
   * Class name applied directly to the symbol
   */
  symbolClassName?: string;
}

export type NotariLayout = NotariLogoLayout;

const SUBTITLES: Record<NotariLogoVariant, string> = {
  public: "OAU Event Platform",
  admin: "OAU Administration",
  student: "Student Portal",
  organizer: "Organizer Portal",
  auth: "OAU Event Platform",
};

const DEFAULT_HREFS: Record<NotariLogoVariant, string> = {
  admin: "/admin",
  student: "/student",
  organizer: "/organizer",
  public: "/",
  auth: "/",
};

const SYMBOL_SIZES: Record<NotariLogoSize, number> = {
  sm: 26,
  md: 36,
  lg: 48,
  xl: 64,
};

const WORDMARK_SIZES: Record<NotariLogoSize, string> = {
  sm: "text-sm sm:text-base tracking-[0.14em]",
  md: "text-base sm:text-xl tracking-[0.14em]",
  lg: "text-xl sm:text-2xl tracking-[0.15em]",
  xl: "text-2xl sm:text-3xl tracking-[0.16em]",
};

const SUBTITLE_SIZES: Record<NotariLogoSize, string> = {
  sm: "text-[8px] tracking-[0.16em]",
  md: "text-[9px] sm:text-[10px] tracking-[0.18em]",
  lg: "text-[10px] sm:text-[11px] tracking-[0.2em]",
  xl: "text-xs tracking-[0.22em]",
};

/**
 * Official NOTARI 2.0 Brand Logo Component
 * Combines the Great Ife University Crest with the modern NOTARI wordmark
 */
export function NotariLogo({
  variant = "public",
  layout = "horizontal",
  size = "md",
  isDark = false,
  showSubtitle = true,
  href,
  className,
  symbolClassName,
}: NotariLogoProps) {
  const symbolPx = SYMBOL_SIZES[size];
  const targetHref = href === false ? null : href ?? DEFAULT_HREFS[variant];
  const subtitleText = SUBTITLES[variant];

  // 1. Symbol Only layout
  if (layout === "symbol-only") {
    const symbolContent = (
      <NotariSymbol
        size={symbolPx}
        className={cn("transition-transform duration-200 group-hover:scale-105", symbolClassName)}
      />
    );

    if (!targetHref) {
      return (
        <div
          className={cn("inline-flex items-center justify-center shrink-0 select-none", className)}
          aria-label="NOTARI"
        >
          {symbolContent}
        </div>
      );
    }

    return (
      <Link
        href={targetHref}
        className={cn("inline-flex items-center justify-center shrink-0 select-none group", className)}
        aria-label="NOTARI Home"
      >
        {symbolContent}
      </Link>
    );
  }

  // 2. Full Logo (Horizontal or Stacked)
  const isStacked = layout === "stacked";

  const content = (
    <>
      <NotariSymbol
        size={symbolPx}
        className={cn(
          "transition-transform duration-200 group-hover:scale-105 shrink-0",
          symbolClassName
        )}
      />

      <div
        className={cn(
          "flex flex-col leading-none min-w-0",
          isStacked ? "items-center text-center mt-2.5" : "text-left"
        )}
      >
        <span
          className={cn(
            "font-black font-sans transition-colors uppercase truncate",
            WORDMARK_SIZES[size],
            isDark
              ? "text-white group-hover:text-teal-300"
              : "text-[#151C35] group-hover:text-[#4169E1]"
          )}
        >
          NOTARI
        </span>

        {showSubtitle && (
          <span
            className={cn(
              "font-semibold uppercase truncate mt-0.5",
              SUBTITLE_SIZES[size],
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {subtitleText}
          </span>
        )}
      </div>
    </>
  );

  const containerClasses = cn(
    "inline-flex select-none group shrink-0",
    isStacked ? "flex-col items-center justify-center gap-1" : "items-center gap-2.5 sm:gap-3",
    className
  );

  if (!targetHref) {
    return <div className={containerClasses}>{content}</div>;
  }

  return (
    <Link href={targetHref} className={containerClasses}>
      {content}
    </Link>
  );
}

export { NotariSymbol };
