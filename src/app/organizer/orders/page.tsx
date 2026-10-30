import React from "react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/status-pill";

export default function OrganizerOrdersPage() {
  const orders = [
    { ref: "NOT-2025-001", customer: "Bamidele Adebayo", event: "OAU Tech Summit 2025", amount: "₦3,500", date: "May 10, 2025", status: "confirmed" },
    { ref: "NOT-2025-002", customer: "Aisha Mohammed", event: "OAU Tech Summit 2025", amount: "₦3,500", date: "May 11, 2025", status: "confirmed" },
    { ref: "NOT-2025-003", customer: "Tunde Akinola", event: "Robotics Workshop", amount: "₦2,500", date: "May 12, 2025", status: "pending" },
    { ref: "NOT-2025-004", customer: "Ngozi Okafor", event: "Creative Writing", amount: "Free", date: "May 13, 2025", status: "confirmed" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Orders & Transactions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Real-time record of all student ticket purchases and free reservations.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Reference</th>
                <th className="pb-3">Student Name</th>
                <th className="pb-3">Event</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.ref} className="hover:bg-slate-50/50">
                  <td className="py-3 font-mono font-bold text-notari-dark">{o.ref}</td>
                  <td className="py-3 font-medium text-slate-700">{o.customer}</td>
                  <td className="py-3 text-slate-600">{o.event}</td>
                  <td className="py-3 font-semibold text-notari-dark">{o.amount}</td>
                  <td className="py-3 text-slate-400">{o.date}</td>
                  <td className="py-3">
                    <StatusPill status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
