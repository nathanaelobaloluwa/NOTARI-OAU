import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Banner Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4 space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-md" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 sm:p-5 border-slate-200/80 bg-white rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </Card>
        ))}
      </div>

      {/* Main Content Sections Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card className="p-5 border-slate-200/80 bg-white rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card className="p-5 border-slate-200/80 bg-white rounded-2xl space-y-4">
            <Skeleton className="h-6 w-36 rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

