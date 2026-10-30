import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";

export default function AdminUsersPage() {
  const users = [
    { name: "Adeola Johnson", email: "adeola.johnson@oau.edu.ng", role: "Student", status: "Active" },
    { name: "Fatima Bello", email: "fatima.bello@oau.edu.ng", role: "Student", status: "Active" },
    { name: "Oluwaseun Lawal", email: "lawal@oau.edu.ng", role: "Organizer", status: "Pending" },
    { name: "Toyin Akinyele", email: "toyin@oau.edu.ng", role: "Organizer", status: "Active" },
    { name: "Admin User", email: "admin@oau.edu.ng", role: "Super Admin", status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Users & Permissions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Superadmin management of student, organizer, and administrator accounts.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Name</th>
                <th className="pb-3">University Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-bold text-[#101C3A]">{u.name}</td>
                  <td className="py-3.5 text-slate-500">{u.email}</td>
                  <td className="py-3.5 font-semibold text-slate-700">{u.role}</td>
                  <td className="py-3.5">
                    <Badge variant={u.status === "Active" ? "success" : "warning"} className="text-[11px]">
                      {u.status}
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
