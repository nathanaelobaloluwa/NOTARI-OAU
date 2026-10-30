import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Ticket } from "lucide-react";

export default function OrganizerTicketTiersPage() {
  const tiers = [
    { name: "General Admission", price: 3500, capacity: 400, sold: 300, status: "Active" },
    { name: "Student Early Bird", price: 2000, capacity: 100, sold: 100, status: "Sold Out" },
    { name: "VIP Backstage Pass", price: 7500, capacity: 50, sold: 32, status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Ticket Tiers & Pricing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure admission categories, price levels, and ticket limits.
          </p>
        </div>

        <Button className="rounded-xl px-4 gap-2 bg-purple-600 hover:bg-purple-700 text-xs font-semibold">
          <PlusCircle className="w-4 h-4" />
          <span>Add Ticket Tier</span>
        </Button>
      </div>

      <div className="space-y-3">
        {tiers.map((t, idx) => (
          <Card key={idx} className="p-4 border-slate-200/80 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-notari-dark">{t.name}</h4>
                <p className="text-xs text-slate-400">
                  {t.sold} / {t.capacity} passes reserved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-notari-dark">₦{t.price.toLocaleString()}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700">
                {t.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
