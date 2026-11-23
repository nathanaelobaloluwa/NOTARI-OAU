import React from "react";
import { cn } from "@/lib/utils";

export interface NotariSymbolProps {
  className?: string;
  size?: number | string;
  showGlow?: boolean;
  animated?: boolean;
}

/**
 * Official NOTARI 2.0 Academic University Crest
 * Features:
 * - Traditional heraldic shield geometry with polished golden border
 * - Obafemi Awolowo University (Great Ife) heritage: bronze Ife head charge and torch of knowledge
 * - Spread academic volume symbolizing academic excellence and wisdom
 * - Campus Teal and Electric Blue inner radiance
 */
export function NotariSymbol({
  className,
  size = 40,
  showGlow = false,
  animated = false,
}: NotariSymbolProps) {
  const uniqueId = React.useId().replace(/:/g, "");

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 aspect-[100/115]",
        showGlow && "filter drop-shadow-[0_4px_16px_rgba(65,105,225,0.35)]",
        className
      )}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${Math.round(size * 1.15)}px` : undefined,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-full h-full overflow-visible",
          animated && "animate-notari-pulse"
        )}
      >
        <defs>
          {/* Outer Shield Gold Metallic Gradient */}
          <linearGradient id={`goldRim-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="25%" stopColor="#F59E0B" />
            <stop offset="65%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>

          {/* Inner Crest Midnight Navy Background */}
          <linearGradient id={`shieldBg-${uniqueId}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#151C35" />
            <stop offset="45%" stopColor="#1B264F" />
            <stop offset="100%" stopColor="#0B1020" />
          </linearGradient>

          {/* Electric Blue Luminous Sheen */}
          <linearGradient id={`electricGlow-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4169E1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#20BFA9" stopOpacity="0.4" />
          </linearGradient>

          {/* Campus Teal Torch Gradient */}
          <linearGradient id={`torchFlame-${uniqueId}`} x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="45%" stopColor="#FBBF24" />
            <stop offset="85%" stopColor="#20BFA9" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          {/* Book Pages Gradient */}
          <linearGradient id={`bookPage-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          {/* Ife Bronze Head Gradient */}
          <linearGradient id={`ifeBronze-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="30%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>

        {/* 1. Shield Outer Drop/Base */}
        <path
          d="M50 4 L88 18 C88 56 74 92 50 112 C26 92 12 56 12 18 Z"
          fill={`url(#shieldBg-${uniqueId})`}
          stroke={`url(#goldRim-${uniqueId})`}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* 2. Inner Golden Fillet Inset Line */}
        <path
          d="M50 10 L82 22 C82 53 70 85 50 103 C30 85 18 53 18 22 Z"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="1"
          strokeOpacity="0.5"
          strokeDasharray="4 2"
        />

        {/* 3. Subtle University Starfield / Radiance */}
        <circle cx="50" cy="35" r="26" fill={`url(#electricGlow-${uniqueId})`} opacity="0.15" />

        {/* 4. Upper Academic Volume (Open Book of Knowledge) */}
        <g id="academic-book">
          {/* Left Leaf */}
          <path
            d="M48 40 C36 36 26 38 22 41 C22 41 22 56 22 57 C26 54 36 52 48 56 Z"
            fill={`url(#bookPage-${uniqueId})`}
            stroke="#151C35"
            strokeWidth="0.8"
          />
          {/* Right Leaf */}
          <path
            d="M52 40 C64 36 74 38 78 41 C78 41 78 56 78 57 C74 54 64 52 52 56 Z"
            fill={`url(#bookPage-${uniqueId})`}
            stroke="#151C35"
            strokeWidth="0.8"
          />
          {/* Page Lines (Left) */}
          <path d="M26 46 C32 44 40 43 45 45" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M26 50 C32 48 40 47 45 49" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
          {/* Page Lines (Right) */}
          <path d="M74 46 C68 44 60 43 55 45" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M74 50 C68 48 60 47 55 49" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
          {/* Central Book Spine */}
          <path d="M50 39 V57" stroke={`url(#goldRim-${uniqueId})`} strokeWidth="1.6" strokeLinecap="round" />
        </g>

        {/* 5. The Great Ife Torch of Knowledge & Enlightenment (surmounting book) */}
        <g id="knowledge-torch">
          <path
            d="M50 20 C45 27 44 32 47 37 C48.5 35 51.5 35 53 37 C56 32 55 27 50 20 Z"
            fill={`url(#torchFlame-${uniqueId})`}
          />
          <circle cx="50" cy="30" r="2.2" fill="#FFFFFF" />
        </g>

        {/* 6. Central Charge: Obafemi Awolowo University Ori Olokun / Ife Bronze Crown & Emblem */}
        <g id="ife-bronze-heritage">
          {/* Beaded Royal Crown Crest */}
          <path
            d="M36 67 C42 62 58 62 64 67 L62 72 C56 69 44 69 38 72 Z"
            fill={`url(#ifeBronze-${uniqueId})`}
            stroke="#FDE68A"
            strokeWidth="0.6"
          />
          {/* Crown Jewels / Plumes */}
          <circle cx="43" cy="64" r="1.4" fill="#20BFA9" />
          <circle cx="50" cy="62" r="1.8" fill="#FBBF24" />
          <circle cx="57" cy="64" r="1.4" fill="#20BFA9" />

          {/* Sculpted Head Silhouette */}
          <path
            d="M40 72 C40 85 46 91 50 92 C54 91 60 85 60 72 C55 70 45 70 40 72 Z"
            fill={`url(#ifeBronze-${uniqueId})`}
            stroke="#92400E"
            strokeWidth="0.6"
          />

          {/* Iconic Ife Linear Striations (Fine facial grooves of historic bronze) */}
          <path d="M43 76 C47 77 53 77 57 76" stroke="#B45309" strokeWidth="0.6" strokeLinecap="round" opacity="0.75" />
          <path d="M44 80 C47 81 53 81 56 80" stroke="#B45309" strokeWidth="0.6" strokeLinecap="round" opacity="0.75" />
          <path d="M45 84 C48 85 52 85 55 84" stroke="#B45309" strokeWidth="0.6" strokeLinecap="round" opacity="0.75" />
          <path d="M47 88 C48.5 89 51.5 89 53 88" stroke="#B45309" strokeWidth="0.6" strokeLinecap="round" opacity="0.75" />
        </g>

        {/* 7. Base Foundation Scroll & Great Ife Academic Stars */}
        <g id="base-laurels">
          <circle cx="50" cy="99" r="2.2" fill="#FBBF24" />
          <circle cx="42" cy="96" r="1.6" fill="#20BFA9" />
          <circle cx="58" cy="96" r="1.6" fill="#20BFA9" />
          <circle cx="35" cy="91" r="1.2" fill="#FDE68A" />
          <circle cx="65" cy="91" r="1.2" fill="#FDE68A" />
        </g>
      </svg>
    </div>
  );
}
