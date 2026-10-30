import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminAttendeesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Platform Attendees Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          All university students registered for campus events.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Student Name</th>
                <th className="pb-3">Matric No.</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Faculty</th>
                <th className="pb-3">Total Passes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 font-bold text-[#101C3A]">Adeola Johnson</td>
                <td className="py-3 font-mono text-slate-500">CSC/2021/1234</td>
                <td className="py-3 text-slate-600">Computer Science</td>
                <td className="py-3 text-slate-600">Faculty of Science</td>
                <td className="py-3 font-bold text-blue-600">3 events</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 font-bold text-[#101C3A]">Bamidele Adebayo</td>
                <td className="py-3 font-mono text-slate-500">MEE/2020/0912</td>
                <td className="py-3 text-slate-600">Mechanical Engineering</td>
                <td className="py-3 text-slate-600">Faculty of Technology</td>
                <td className="py-3 font-bold text-blue-600">1 event</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-3 font-bold text-[#101C3A]">Aisha Mohammed</td>
                <td className="py-3 font-mono text-slate-500">LAW/2022/0451</td>
                <td className="py-3 text-slate-600">Jurisprudence & Law</td>
                <td className="py-3 text-slate-600">Faculty of Law</td>
                <td className="py-3 font-bold text-blue-600">2 events</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
