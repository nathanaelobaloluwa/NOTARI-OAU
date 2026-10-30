import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Calendar, Ticket, DollarSign, Users } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Insights into university events, student bookings, and gross platform volume.
          </p>
        </div>

        <Button variant="outline" className="rounded-xl px-4 gap-2 text-xs font-semibold shadow-xs">
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200/80 bg-white shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Total Events</p>
          <h3 className="text-2xl font-bold text-[#101C3A] mt-1">48</h3>
          <span className="text-[11px] text-emerald-600 font-semibold">+12% vs last month</span>
        </Card>
        <Card className="p-5 border-slate-200/80 bg-white shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Total Bookings</p>
          <h3 className="text-2xl font-bold text-[#101C3A] mt-1">1,248</h3>
          <span className="text-[11px] text-emerald-600 font-semibold">+78% vs last month</span>
        </Card>
        <Card className="p-5 border-slate-200/80 bg-white shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Platform Revenue</p>
          <h3 className="text-2xl font-bold text-[#101C3A] mt-1">₦2,560,000</h3>
          <span className="text-[11px] text-emerald-600 font-semibold">+24% vs last month</span>
        </Card>
        <Card className="p-5 border-slate-200/80 bg-white shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Active Organizers</p>
          <h3 className="text-2xl font-bold text-[#101C3A] mt-1">12</h3>
          <span className="text-[11px] text-slate-400 font-medium">Verified clubs & faculties</span>
        </Card>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#101C3A] uppercase tracking-wider">
          Semester Event Participation Summary
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Over 84% of university event bookings occurred within the first 48 hours of publication. Tech & Innovation events continue to generate the highest engagement among Faculty of Science and Technology students, while Music & Cultural nights in Oduduwa Hall and Amphi Theatre achieve the highest total volume.
        </p>
      </Card>
    </div>
  );
}
