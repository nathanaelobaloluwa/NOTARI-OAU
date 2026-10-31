import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentHistoryLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* 2. Tabs Skeleton */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* 3. Search Bar Skeleton */}
      <Skeleton className="h-10 w-full max-w-md rounded-xl" />

      {/* 4. History Cards Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 sm:p-5 border-slate-200/80 bg-white rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

