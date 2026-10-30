import React from "react";
import { Card } from "@/components/ui/card";

export default function OrganizerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Event Analytics & Insights
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Conversion rates, peak booking times, and attendee demographics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-slate-200/80 bg-white space-y-4">
          <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
            Booking Conversion
          </h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Page Views:</span>
              <span className="font-bold text-notari-dark">3,420</span>
            </div>
            <div className="flex justify-between">
              <span>Checkout Started:</span>
              <span className="font-bold text-notari-dark">412</span>
            </div>
            <div className="flex justify-between">
              <span>Completed Bookings:</span>
              <span className="font-bold text-emerald-600">248 (60.2%)</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200/80 bg-white space-y-4">
          <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
            Top Faculties of Attendees
          </h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Faculty of Science:</span>
              <span className="font-bold text-notari-dark">42%</span>
            </div>
            <div className="flex justify-between">
              <span>Faculty of Technology:</span>
              <span className="font-bold text-notari-dark">28%</span>
            </div>
            <div className="flex justify-between">
              <span>Faculty of Arts:</span>
              <span className="font-bold text-notari-dark">15%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
