import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Clock } from "lucide-react";

export default function AdminApprovalsPage() {
  const pendingApprovals = [
    {
      id: "app-1",
      type: "Organizer Application",
      applicant: "Tech Innovation Club OAU",
      submittedBy: "Bamidele Adebayo (CSC/2020/0912)",
      faculty: "Faculty of Science",
      time: "2 hours ago",
    },
    {
      id: "app-2",
      type: "Event Submission",
      applicant: "Robotics & Embedded Systems Workshop",
      submittedBy: "OAU Engineering Faculty",
      faculty: "Faculty of Technology",
      time: "3 hours ago",
    },
    {
      id: "app-3",
      type: "Organizer Application",
      applicant: "OAU Literary & Debating Society",
      submittedBy: "Kehinde Alao (LAW/2021/0312)",
      faculty: "Faculty of Law",
      time: "1 day ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Approvals Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Review organizer accreditation requests and new event submissions.
        </p>
      </div>

      <div className="space-y-4">
        {pendingApprovals.map((item) => (
          <Card key={item.id} className="p-5 border-slate-200/80 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-xs">
                  Pending Review
                </Badge>
                <span className="text-xs font-semibold text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">{item.type}</span>
              </div>
              <h3 className="text-base font-bold text-[#101C3A]">{item.applicant}</h3>
              <p className="text-xs text-slate-500">
                Submitted by: {item.submittedBy} • {item.faculty}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 justify-end">
              <Button size="sm" variant="outline" className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1">
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </Button>
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
