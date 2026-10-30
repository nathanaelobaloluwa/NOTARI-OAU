import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export default function OrganizerPayoutsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Revenue & Payouts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track your ticket proceeds and disbursement schedules via Paystack.
          </p>
        </div>

        <Button className="rounded-xl px-4 gap-1.5 bg-purple-600 hover:bg-purple-700 text-xs font-semibold">
          <ArrowUpRight className="w-4 h-4" />
          <span>Request Payout</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-slate-200/80 bg-white">
          <p className="text-xs text-slate-400 font-medium">Available Balance</p>
          <h3 className="text-2xl font-bold text-notari-dark mt-1">₦680,000</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-2">Ready for withdrawal</p>
        </Card>
        <Card className="p-5 border-slate-200/80 bg-white">
          <p className="text-xs text-slate-400 font-medium">Pending Settlement</p>
          <h3 className="text-2xl font-bold text-slate-600 mt-1">₦140,000</h3>
          <p className="text-[11px] text-slate-400 mt-2">Processing via Paystack (T+1)</p>
        </Card>
        <Card className="p-5 border-slate-200/80 bg-white">
          <p className="text-xs text-slate-400 font-medium">Total Paid Out</p>
          <h3 className="text-2xl font-bold text-notari-dark mt-1">₦1,450,000</h3>
          <p className="text-[11px] text-slate-400 mt-2">To verified bank account</p>
        </Card>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white space-y-4">
        <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider">
          Linked Disbursement Account
        </h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <p className="font-bold text-notari-dark">First Bank of Nigeria</p>
            <p className="text-slate-500 font-mono">3124567890 • Tech Innovation Club OAU</p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Verified
          </span>
        </div>
      </Card>
    </div>
  );
}
