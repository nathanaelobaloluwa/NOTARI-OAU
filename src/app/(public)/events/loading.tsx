import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function EventsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-300">
      {/* 1. Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-9 w-64 sm:w-80 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>

      {/* 2. Search & Filter Bar Skeleton */}
      <Card className="p-4 sm:p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Skeleton className="h-10 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </Card>

      {/* 3. Event Count Skeleton */}
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-4 w-44 rounded-md" />
      </div>

      {/* 4. Events Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden border-slate-200/80 bg-white rounded-2xl flex flex-col shadow-sm">
            {/* Image Placeholder */}
            <Skeleton className="h-48 w-full rounded-none" />

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                {/* Category & Status */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                {/* Title */}
                <Skeleton className="h-6 w-5/6 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />

                {/* Date & Venue */}
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32 rounded-md" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                  </div>
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
