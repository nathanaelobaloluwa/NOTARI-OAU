import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function StudentSettingsLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-4xl pb-16">
      {/* 1. Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 sm:h-9 w-64 rounded-xl" />
        <Skeleton className="h-4 w-80 rounded-md" />
      </div>

      {/* 2. Identity Banner Skeleton */}
      <Card className="p-4 sm:p-5 border-slate-200/80 shadow-sm bg-white rounded-2xl">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>
        </div>
      </Card>

      {/* 3. Forms Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Form Card */}
        <Card className="p-5 sm:p-6 border-slate-200/80 bg-white rounded-2xl shadow-sm space-y-4">
          <Skeleton className="h-6 w-44 rounded-md" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </Card>

        {/* Security / Password Card */}
        <Card className="p-5 sm:p-6 border-slate-200/80 bg-white rounded-2xl shadow-sm space-y-4">
          <Skeleton className="h-6 w-40 rounded-md" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </Card>
      </div>
    </div>
  );
}

