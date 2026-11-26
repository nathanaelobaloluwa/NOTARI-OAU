"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "student" | "organizer" | "admin" | "default";
  className?: string;
  alt?: string;
  priority?: boolean;
}

/**
 * Derives clean 1-2 character uppercase initials from user name or email.
 * E.g., "John Ade" -> "JA", "Obaloluwa" -> "OB", "john.doe@oaulife.edu.ng" -> "JD"
 */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const clean = name.trim();
  
  // If it's an email address, extract username part
  const subject = clean.includes("@") ? clean.split("@")[0].replace(/[._-]/g, " ") : clean;
  const parts = subject.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_MAP = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl font-black",
};

const PIXEL_SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const VARIANT_FALLBACK_STYLES = {
  student: "bg-indigo-100 text-notari-primary border border-indigo-200/60",
  organizer: "bg-purple-100 text-purple-700 border border-purple-200/60",
  admin: "bg-[#151C35] text-white border border-blue-500/30",
  default: "bg-slate-100 text-slate-700 border border-slate-200/80",
};

export function UserAvatar({
  src,
  name,
  size = "md",
  variant = "student",
  className,
  alt,
  priority = false,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(name);
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const pxSize = PIXEL_SIZE_MAP[size] || 40;
  const fallbackStyles = VARIANT_FALLBACK_STYLES[variant] || VARIANT_FALLBACK_STYLES.student;

  // Reset error state if image source changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const hasValidPhoto = Boolean(src && src.trim().length > 0 && !hasError);

  if (hasValidPhoto && src) {
    const isExternal = src.startsWith("http://") || src.startsWith("https://");
    const isBlob = src.startsWith("blob:") || src.startsWith("data:");

    return (
      <div
        className={cn(
          "relative rounded-full overflow-hidden shrink-0 select-none ring-1 ring-slate-200/70 shadow-2xs",
          sizeClasses,
          className
        )}
      >
        {isBlob || src.startsWith("/api/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || name || "User Profile Photo"}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : isExternal ? (
          <Image
            src={src}
            alt={alt || name || "User Profile Photo"}
            width={pxSize}
            height={pxSize}
            priority={priority}
            unoptimized={src.includes("res.cloudinary.com")}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <Image
            src={src}
            alt={alt || name || "User Profile Photo"}
            width={pxSize}
            height={pxSize}
            priority={priority}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </div>
    );
  }

  // Fallback to initials avatar
  return (
    <div
      aria-label={name ? `${name}'s Avatar` : "User Avatar"}
      className={cn(
        "rounded-full flex items-center justify-center font-bold tracking-tight select-none shrink-0 shadow-2xs",
        sizeClasses,
        fallbackStyles,
        className
      )}
    >
      <span>{initials}</span>
    </div>
  );
}
