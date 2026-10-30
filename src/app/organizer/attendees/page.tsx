import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrganizerAttendeesPage() {
  const attendees = [
    { name: "Adeola Johnson", matric: "CSC/2021/1234", email: "adeola.johnson@oau.edu.ng", tier: "General Admission", checkedIn: true },
    { name: "Bamidele Adebayo", matric: "MEE/2020/0912", email: "bamidele@oau.edu.ng", tier: "General Admission", checkedIn: false },
    { name: "Aisha Mohammed", matric: "LAW/2022/0451", email: "aisha@oau.edu.ng", tier: "VIP Pass", checkedIn: true },
    { name: "Chinedu Eze", matric: "PHM/2019/0118", email: "chinedu@oau.edu.ng", tier: "General Admission", checkedIn: false },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Event Attendees
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          List of registered students with matriculation numbers and check-in status.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Attendee Name</th>
                <th className="pb-3">Matric No.</th>
                <th className="pb-3">University Email</th>
                <th className="pb-3">Ticket Type</th>
                <th className="pb-3">Gate Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendees.map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-3 font-bold text-notari-dark">{a.name}</td>
                  <td className="py-3 font-mono text-slate-500">{a.matric}</td>
                  <td className="py-3 text-slate-600">{a.email}</td>
                  <td className="py-3 text-slate-700 font-medium">{a.tier}</td>
                  <td className="py-3">
                    <Badge variant={a.checkedIn ? "success" : "outline"} className="text-[11px]">
                      {a.checkedIn ? "Checked In" : "Not Arrived"}
                    </Badge>
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
