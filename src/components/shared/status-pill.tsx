import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusType =
  | "published"
  | "pending"
  | "pending_approval"
  | "draft"
  | "rejected"
  | "confirmed"
  | "free"
  | "paid"
  | "active"
  | "cancelled";

interface StatusPillProps {
  status: StatusType | string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const normalized = status.toLowerCase();

  switch (normalized) {
    case "published":
    case "confirmed":
    case "active":
      return (
        <Badge
          variant="success"
          className={cn("bg-emerald-50 text-emerald-700 border-emerald-200 capitalize font-medium", className)}
        >
          {status}
        </Badge>
      );

    case "pending":
    case "pending_approval":
    case "pending approval":
      return (
        <Badge
          variant="warning"
          className={cn("bg-amber-50 text-amber-700 border-amber-200 capitalize font-medium", className)}
        >
          Pending Approval
        </Badge>
      );

    case "draft":
      return (
        <Badge
          variant="outline"
          className={cn("bg-slate-100 text-slate-600 border-slate-200 capitalize font-medium", className)}
        >
          Draft
        </Badge>
      );

    case "free":
      return (
        <Badge
          variant="subtle"
          className={cn("bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold", className)}
        >
          Free Event
        </Badge>
      );

    case "rejected":
    case "cancelled":
      return (
        <Badge
          variant="error"
          className={cn("bg-rose-50 text-rose-700 border-rose-200 capitalize font-medium", className)}
        >
          {status}
        </Badge>
      );

    default:
      return (
        <Badge variant="outline" className={cn("capitalize", className)}>
          {status}
        </Badge>
      );
  }
}
