import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function StudentHistoryPage() {
  const attendedEvents = [
    {
      id: "hist-1",
      title: "Great Ife Freshers Orientation 2024",
      date: "Nov 12, 2024",
      venue: "Oduduwa Hall",
      category: "Academic",
    },
    {
      id: "hist-2",
      title: "Faculty of Science Dean's Lecture",
      date: "Oct 5, 2024",
      venue: "Health Sciences Auditorium",
      category: "Academic",
    },
    {
      id: "hist-3",
      title: "OAU Inter-Faculty Sports Games Opening",
      date: "Aug 18, 2024",
      venue: "Sports Complex",
      category: "Sports",
    },
    {
      id: "hist-4",
      title: "Google Developer Student Clubs Info Session",
      date: "Jun 20, 2024",
      venue: "Engineering Lecture Theatre",
      category: "Technology",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Event Attendance History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Record of all past campus events you attended and verified tickets.
        </p>
      </div>

      <div className="space-y-3">
        {attendedEvents.map((evt) => (
          <Card key={evt.id} className="p-4 border-slate-200/80 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-notari-dark">{evt.title}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{evt.date}</span>
                  <span>•</span>
                  <span>{evt.venue}</span>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
              Attended
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
