import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function EventDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-in fade-in duration-300 pb-24 lg:pb-10">
      {/* 1. Back link skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* 2. Hero Cover Banner Skeleton */}
      <Skeleton className="aspect-[16/9] sm:aspect-[21/9] w-full rounded-3xl" />

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-36 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            <Skeleton className="h-10 w-4/5 rounded-xl" />

            {/* Quick Metadata Box Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-5 w-52 rounded-md" />
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
          </div>

          {/* Description Section Skeleton */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-11/12 rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
          </div>

          {/* Ticket Tiers Skeleton */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <Skeleton className="h-6 w-36 rounded-md" />
            <div className="space-y-2.5">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Right Column: Booking Card Skeleton (4 cols) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-24">
          <Card className="p-6 border-slate-200/90 shadow-md space-y-6 rounded-2xl bg-white">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-40 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

