import React from "react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/status-pill";

export default function AdminOrganizersPage() {
  const organizers = [
    { name: "OAU Computer Science Dept.", rep: "Prof. O. Babatunde", email: "cs@oau.edu.ng", events: 8, status: "active" },
    { name: "OAU Engineering Faculty", rep: "Engr. D. Adeleke", email: "engineering@oau.edu.ng", events: 12, status: "active" },
    { name: "OAU Student Union", rep: "SU President", email: "union@oau.edu.ng", events: 15, status: "active" },
    { name: "Tech Innovation Club", rep: "Bamidele Adebayo", email: "techclub@oau.edu.ng", events: 3, status: "pending" },
    { name: "OAU Literary Society", rep: "Kehinde Alao", email: "literary@oau.edu.ng", events: 2, status: "active" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Organizers Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Accredited student associations, departmental committees, and campus event hosts.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Organization Name</th>
                <th className="pb-3">Representative</th>
                <th className="pb-3">Official Email</th>
                <th className="pb-3">Hosted Events</th>
                <th className="pb-3">Accreditation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizers.map((org, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-bold text-[#101C3A]">{org.name}</td>
                  <td className="py-3.5 text-slate-600">{org.rep}</td>
                  <td className="py-3.5 text-slate-500">{org.email}</td>
                  <td className="py-3.5 font-bold text-blue-600">{org.events} events</td>
                  <td className="py-3.5">
                    <StatusPill status={org.status} />
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
