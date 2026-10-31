"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BookmarkButtonProps {
  eventId: string;
  initialIsBookmarked?: boolean;
  variant?: "floating" | "button" | "icon";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  onToggle?: (isSaved: boolean) => void;
  className?: string;
  isAuthenticated?: boolean;
  isStudent?: boolean;
}

export function BookmarkButton({
  eventId,
  initialIsBookmarked = false,
  variant = "floating",
  size = "md",
  showLabel = false,
  onToggle,
  className,
  isAuthenticated = true,
  isStudent = true,
}: BookmarkButtonProps) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState<boolean>(initialIsBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/events`);
      return;
    }

    if (!isStudent) {
      alert("Only student accounts can save events to bookmarks.");
      return;
    }

    if (isPending) return;

    const previousState = isBookmarked;
    const newState = !previousState;

    // Optimistic UI update
    setIsBookmarked(newState);
    if (onToggle) onToggle(newState);

    startTransition(async () => {
      try {
        const response = await fetch(
          newState ? "/api/bookmarks" : `/api/bookmarks?eventId=${eventId}`,
          {
            method: newState ? "POST" : "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            ...(newState ? { body: JSON.stringify({ eventId }) } : {}),
          }
        );

        const data = await response.json();
        if (!response.ok || !data.success) {
          // Revert optimistic update on error
          setIsBookmarked(previousState);
          if (onToggle) onToggle(previousState);
          console.error("❌ Bookmark operation failed:", data.message);
        } else {
          router.refresh();
        }
      } catch (err) {
        // Revert optimistic update on network fault
        setIsBookmarked(previousState);
        if (onToggle) onToggle(previousState);
        console.error("❌ Network error while toggling bookmark:", err);
      }
    });
  };

  if (variant === "button") {
    const sizeClasses =
      size === "sm"
        ? "px-3 py-1.5 text-xs min-h-[38px]"
        : size === "lg"
        ? "px-5 py-3 text-sm min-h-[48px]"
        : "px-4 py-2.5 text-xs sm:text-sm min-h-[44px]";

    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all border shadow-sm touch-manipulation",
          sizeClasses,
          isBookmarked
            ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
          isPending && "opacity-70 cursor-wait",
          className
        )}
        aria-label={isBookmarked ? "Remove from saved events" : "Save event to bookmarks"}
        title={isBookmarked ? "Remove from bookmarks" : "Save event"}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
        ) : (
          <Bookmark
            className={cn(
              "w-4 h-4 transition-transform active:scale-125",
              isBookmarked ? "fill-purple-600 text-purple-600" : "text-slate-600"
            )}
          />
        )}
        {showLabel && (
          <span>{isBookmarked ? "Saved in Bookmarks" : "Save Event"}</span>
        )}
      </button>
    );
  }

  if (variant === "icon") {
    const iconSizeClasses =
      size === "sm"
        ? "p-2 min-w-[38px] min-h-[38px]"
        : size === "lg"
        ? "p-3 min-w-[48px] min-h-[48px]"
        : "p-2.5 min-w-[44px] min-h-[44px]";

    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "rounded-xl transition-all touch-manipulation flex items-center justify-center",
          iconSizeClasses,
          isBookmarked
            ? "bg-purple-50 text-purple-600 hover:bg-purple-100"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
          isPending && "opacity-70 cursor-wait",
          className
        )}
        aria-label={isBookmarked ? "Remove from saved events" : "Save event to bookmarks"}
        title={isBookmarked ? "Remove from bookmarks" : "Save event"}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
        ) : (
          <Bookmark
            className={cn(
              "w-4 h-4 transition-transform active:scale-125",
              isBookmarked ? "fill-purple-600 text-purple-600" : "text-slate-400"
            )}
          />
        )}
      </button>
    );
  }

  // Default: "floating" badge button over card image
  const floatingSizeClasses =
    size === "sm" ? "w-8 h-8" : size === "lg" ? "w-11 h-11" : "w-9 h-9 sm:w-10 sm:h-10";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "rounded-full flex items-center justify-center shadow-md backdrop-blur-md transition-all touch-manipulation border",
        floatingSizeClasses,
        isBookmarked
          ? "bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
          : "bg-white/90 text-slate-600 border-white/60 hover:bg-white hover:text-purple-600",
        isPending && "opacity-70 cursor-wait",
        className
      )}
      aria-label={isBookmarked ? "Remove from saved events" : "Save event to bookmarks"}
      title={isBookmarked ? "Remove from bookmarks" : "Save event"}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
      ) : (
        <Bookmark
          className={cn(
            "w-4 h-4 transition-transform active:scale-125",
            isBookmarked ? "fill-purple-600 text-purple-600" : "text-slate-600"
          )}
        />
      )}
    </button>
  );
}
