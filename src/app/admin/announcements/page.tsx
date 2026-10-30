import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Megaphone } from "lucide-react";
import { StatusPill } from "@/components/shared/status-pill";

export default function AdminAnnouncementsPage() {
  const announcements = [
    { title: "OAU Tech Summit 2025 is Here!", date: "Apr 15, 2025", status: "Published" },
    { title: "New Ticketing System Update", date: "Apr 10, 2025", status: "Published" },
    { title: "Campus Event Guidelines", date: "Apr 5, 2025", status: "Published" },
    { title: "Public Holiday Notice", date: "Apr 1, 2025", status: "Published" },
    { title: "Welcome to NOTARI 2.0", date: "Mar 20, 2025", status: "Published" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            Announcements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish platform-wide broadcast alerts and campus event notices.
          </p>
        </div>

        <Button className="rounded-xl px-4 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-xs">
          <PlusCircle className="w-4 h-4" />
          <span>New Announcement</span>
        </Button>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Title</th>
                <th className="pb-3">Date Published</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {announcements.map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-bold text-[#101C3A]">{a.title}</td>
                  <td className="py-3.5 text-slate-500">{a.date}</td>
                  <td className="py-3.5">
                    <StatusPill status="published" />
                  </td>
                  <td className="py-3.5 text-right space-x-2">
                    <button className="text-blue-600 hover:text-blue-800 font-semibold">
                      Edit
                    </button>
                    <button className="text-rose-600 hover:text-rose-800 font-semibold">
                      Delete
                    </button>
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
