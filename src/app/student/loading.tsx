import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-60 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* 2. Identity Card Skeleton */}
      <Card className="p-4 sm:p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0" />
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </Card>

      {/* 3. Metric Cards Skeleton (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 sm:p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </Card>
        ))}
      </div>

      {/* 4. Upcoming Registered Events Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-4 sm:p-5 border-slate-200/80 bg-white rounded-2xl space-y-3">
              <div className="flex gap-4">
                <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 5. Quick Actions Section */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-5 w-32 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 border-slate-200/80 bg-white rounded-2xl space-y-2">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

