import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Ticket,
  Bookmark,
  Bell,
  Megaphone,
  Users,
  Search,
  Receipt,
  BarChart3,
  Image as ImageIcon,
  AlertCircle,
  RotateCcw,
  PlusCircle,
  FolderOpen,
} from "lucide-react";

export type EmptyStateVariant =
  | "events"
  | "upcoming"
  | "past"
  | "tickets"
  | "bookmarks"
  | "notifications"
  | "announcements"
  | "attendees"
  | "organizer-events"
  | "search"
  | "users"
  | "transactions"
  | "analytics"
  | "flyer"
  | "generic";

export interface NotariEmptyStateProps {
  /**
   * The contextual variant determining icon and preset messaging
   */
  variant?: EmptyStateVariant;

  /**
   * Override title
   */
  title?: string;

  /**
   * Override description explanation
   */
  description?: string;

  /**
   * If true, indicates an API/fetch failure rather than empty data
   */
  isError?: boolean;

  /**
   * Optional custom retry handler when isError is true
   */
  onRetry?: () => void;

  /**
   * Primary action button
   */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };

  /**
   * Secondary action button
   */
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };

  /**
   * Container styling overrides
   */
  className?: string;

  /**
   * Size scale
   */
  compact?: boolean;
}

const PRESETS: Record<
  EmptyStateVariant,
  {
    icon: React.ElementType;
    title: string;
    description: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  events: {
    icon: Calendar,
    title: "No Campus Events Found",
    description: "There are currently no events published matching your selected criteria. Check back soon or explore another faculty.",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4169E1]",
  },
  upcoming: {
    icon: Calendar,
    title: "No Upcoming Events",
    description: "You have no upcoming events on your personal calendar. Discover exciting campus experiences to attend!",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4169E1]",
  },
  past: {
    icon: Calendar,
    title: "No Past Events",
    description: "You haven't attended any events on NOTARI yet. Your event history will be preserved here.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  tickets: {
    icon: Ticket,
    title: "No Ticket Passes Yet",
    description: "You haven't claimed or purchased any event tickets. Browse events and grab your pass to see it here.",
    iconBg: "bg-[#E6FAF7]",
    iconColor: "text-[#20BFA9]",
  },
  bookmarks: {
    icon: Bookmark,
    title: "No Saved Events",
    description: "You haven't bookmarked any events. Save events you're interested in by clicking the bookmark icon on any event card.",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4169E1]",
  },
  notifications: {
    icon: Bell,
    title: "All Caught Up!",
    description: "You have no unread notifications or campus broadcast alerts right now.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  announcements: {
    icon: Megaphone,
    title: "No Campus Announcements",
    description: "There are no official campus or faculty announcements published at this time.",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4169E1]",
  },
  attendees: {
    icon: Users,
    title: "No Registered Attendees Yet",
    description: "No students have registered for this event tier yet. Share your event link across OAU faculty groups!",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4169E1]",
  },
  "organizer-events": {
    icon: PlusCircle,
    title: "No Events Created",
    description: "You haven't created any events yet. Publish your first event to start accepting registrations.",
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4169E1]",
  },
  search: {
    icon: Search,
    title: "No Matching Results",
    description: "We couldn't find any results matching your search query. Try adjusting your keywords, dates, or faculty filters.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  users: {
    icon: Users,
    title: "No Users Found",
    description: "No student or organizer accounts match the specified name, email, or matriculation number.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  transactions: {
    icon: Receipt,
    title: "No Transaction History",
    description: "No payment orders or financial transactions have been recorded for your account.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  analytics: {
    icon: BarChart3,
    title: "Analytics Not Yet Available",
    description: "There is insufficient attendee and ticket activity to compile meaningful attendance or revenue metrics.",
    iconBg: "bg-[#E6FAF7]",
    iconColor: "text-[#20BFA9]",
  },
  flyer: {
    icon: ImageIcon,
    title: "No Event Flyer",
    description: "No official flyer image has been uploaded for this event. Upload an eye-catching poster to boost engagement.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  generic: {
    icon: FolderOpen,
    title: "No Data Available",
    description: "There are no records to display at this time.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
};

export function NotariEmptyState({
  variant = "generic",
  title,
  description,
  isError = false,
  onRetry,
  action,
  secondaryAction,
  className,
  compact = false,
}: NotariEmptyStateProps) {
  const preset = PRESETS[variant] || PRESETS.generic;
  const Icon = isError ? AlertCircle : preset.icon;

  const displayTitle = title || (isError ? "Unable to Load Data" : preset.title);
  const displayDescription = description || (isError
    ? "A network or server error occurred while retrieving this content. Please check your connection and try again."
    : preset.description);

  const iconBg = isError ? "bg-red-50" : preset.iconBg;
  const iconColor = isError ? "text-[#EF4444]" : preset.iconColor;

  return (
    <div
      role="region"
      aria-label={displayTitle}
      className={cn(
        "w-full rounded-2xl border border-slate-200/80 bg-white text-center flex flex-col items-center justify-center select-none",
        compact ? "p-6" : "p-8 sm:p-12",
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105",
          compact ? "w-12 h-12 p-3" : "w-16 h-16 p-4",
          iconBg,
          iconColor
        )}
        aria-hidden="true"
      >
        <Icon className={compact ? "w-6 h-6" : "w-8 h-8"} />
      </div>

      <h3 className={cn("font-bold text-[#151C35] mb-2", compact ? "text-base" : "text-lg")}>
        {displayTitle}
      </h3>

      <p className={cn("text-slate-500 max-w-md mx-auto leading-relaxed mb-6", compact ? "text-xs" : "text-sm")}>
        {displayDescription}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs">
        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4169E1] text-white font-medium text-sm hover:bg-[#3358C8] active:scale-[0.98] transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Retry Request</span>
          </button>
        )}

        {!isError && action && (
          action.href ? (
            <Link
              href={action.href}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4169E1] text-white font-medium text-sm hover:bg-[#3358C8] active:scale-[0.98] transition-all shadow-sm"
            >
              <span>{action.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4169E1] text-white font-medium text-sm hover:bg-[#3358C8] active:scale-[0.98] transition-all shadow-sm"
            >
              <span>{action.label}</span>
            </button>
          )
        )}

        {!isError && secondaryAction && (
          secondaryAction.href ? (
            <Link
              href={secondaryAction.href}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors"
            >
              <span>{secondaryAction.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 transition-colors"
            >
              <span>{secondaryAction.label}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
