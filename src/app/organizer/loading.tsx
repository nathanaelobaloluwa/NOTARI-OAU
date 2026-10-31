import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function OrganizerLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-60 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Metric Cards Skeleton (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3.5 sm:p-5 border-slate-200/80 bg-white rounded-2xl space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-6 w-12 rounded-md" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Sections Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="p-5 border-slate-200/80 bg-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card className="p-5 border-slate-200/80 bg-white rounded-2xl space-y-4">
            <Skeleton className="h-6 w-32 rounded-md" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

