import React from "react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/status-pill";
import { Search } from "lucide-react";

export default function AdminBookingsPage() {
  const bookings = [
    { name: "Bamidele Adebayo", email: "bamidele@oau.edu.ng", event: "OAU Tech Summit 2025", tier: "General", status: "confirmed", amount: "₦3,500" },
    { name: "Aisha Mohammed", email: "aisha@oau.edu.ng", event: "Creative Writing Workshop", tier: "Student", status: "confirmed", amount: "Free" },
    { name: "Tunde Akinola", email: "tunde@oau.edu.ng", event: "Robotics Workshop", tier: "General", status: "pending", amount: "₦2,500" },
    { name: "Ngozi Okafor", email: "ngozi@oau.edu.ng", event: "Mental Health Awareness", tier: "General", status: "confirmed", amount: "Free" },
    { name: "Chinedu Eze", email: "chinedu@oau.edu.ng", event: "Career Fair 2025", tier: "General", status: "confirmed", amount: "Free" },
    { name: "Favour Samuel", email: "favour@oau.edu.ng", event: "Music Concert", tier: "VIP", status: "confirmed", amount: "₦1,500" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Bookings & Attendees
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Superadmin ledger of all campus reservations, payment transactions, and gate admissions.
        </p>
      </div>

      <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, email, booking reference, or event..."
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </Card>

      {/* Mobile Card View (< md) */}
      <div className="space-y-3 md:hidden">
        {bookings.map((b, i) => (
          <Card key={i} className="p-4 border-slate-200/80 bg-white shadow-xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-[#101C3A]">{b.name}</h3>
                <p className="text-xs text-slate-400">{b.email}</p>
              </div>
              <StatusPill status={b.status} />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <p className="text-slate-700 font-medium truncate">{b.event}</p>
                <span className="text-[11px] text-slate-400">{b.tier} Tier</span>
              </div>
              <span className="font-bold text-[#101C3A] shrink-0">{b.amount}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <Card className="hidden md:block p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Student Name</th>
                <th className="pb-3">OAU Email</th>
                <th className="pb-3">Event</th>
                <th className="pb-3">Ticket Type</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-bold text-[#101C3A]">{b.name}</td>
                  <td className="py-3.5 text-slate-500">{b.email}</td>
                  <td className="py-3.5 text-slate-700 font-medium">{b.event}</td>
                  <td className="py-3.5 text-slate-500">{b.tier}</td>
                  <td className="py-3.5 font-semibold text-[#101C3A]">{b.amount}</td>
                  <td className="py-3.5">
                    <StatusPill status={b.status} />
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
