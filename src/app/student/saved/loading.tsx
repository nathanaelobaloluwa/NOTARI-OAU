import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentSavedLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-44 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* 2. Count Skeleton */}
      <Skeleton className="h-4 w-32 rounded-md" />

      {/* 3. Saved Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden border-slate-200/80 bg-white rounded-2xl flex flex-col shadow-sm">
            <Skeleton className="h-44 w-full rounded-none" />

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-6 w-4/5 rounded-md" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-4 w-44 rounded-md" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

