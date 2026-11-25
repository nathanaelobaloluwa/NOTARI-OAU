"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NotariSymbol } from "./notari-symbol";
import { Calendar } from "lucide-react";

export interface EventFlyerImageProps {
  src?: string | null;
  alt: string;
  title?: string;
  category?: string;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
}

export function EventFlyerImage({
  src,
  alt,
  title,
  category,
  className,
  containerClassName,
  priority = false,
  fill = true,
  width,
  height,
  sizes,
}: EventFlyerImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isValidUrl = Boolean(src && typeof src === "string" && src.trim().length > 0 && !hasError);

  // If there's an error or no valid src provided, render the authentic NOTARI branded placeholder
  if (!isValidUrl) {
    return (
      <div
        role="img"
        aria-label={alt || title || "NOTARI Event Flyer"}
        className={cn(
          "w-full h-full relative flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#151C35] via-[#10162B] to-[#0A0E1D] text-white select-none overflow-hidden",
          containerClassName
        )}
      >
        {/* Ambient background glow accents */}
        <div
          className="absolute -top-12 -left-12 w-32 h-32 bg-[#4169E1]/20 rounded-full blur-2xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#20BFA9]/15 rounded-full blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Brand emblem badge */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="p-2.5 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-md mb-2.5 shadow-lg shadow-black/20">
            <NotariSymbol size={32} variant="brand" showGlow />
          </div>

          {category && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#20BFA9] px-2 py-0.5 rounded-full bg-[#20BFA9]/10 border border-[#20BFA9]/20 mb-1.5">
              {category}
            </span>
          )}

          {title && (
            <p className="text-xs font-semibold text-slate-200 line-clamp-2 max-w-[200px] leading-snug">
              {title}
            </p>
          )}

          <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#4169E1]" />
            <span>OAU Campus Event</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden bg-slate-100", containerClassName)}>
      {fill ? (
        <Image
          src={src as string}
          alt={alt || "Event Flyer"}
          fill
          priority={priority}
          sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
          className={cn(
            "object-cover transition-all duration-300",
            isLoading ? "scale-105 blur-sm" : "scale-100 blur-0",
            className
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            console.warn(`⚠️ [IMAGE_FALLBACK] Failed to load flyer at '${src}'. Rendering branded fallback.`);
            setHasError(true);
            setIsLoading(false);
          }}
        />
      ) : (
        <Image
          src={src as string}
          alt={alt || "Event Flyer"}
          width={width || 600}
          height={height || 400}
          priority={priority}
          className={cn(
            "object-cover transition-all duration-300",
            isLoading ? "scale-105 blur-sm" : "scale-100 blur-0",
            className
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            console.warn(`⚠️ [IMAGE_FALLBACK] Failed to load flyer at '${src}'. Rendering branded fallback.`);
            setHasError(true);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
}
