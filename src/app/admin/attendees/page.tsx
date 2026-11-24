import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { Ticket } from "@/models/Ticket";
import { OAU_FACULTIES, formatFacultyLabel, buildFacultyQueryRegex } from "@/constants/oau";
import { Search, Users, Ticket as TicketIcon, GraduationCap } from "lucide-react";

interface AdminAttendeesPageProps {
  searchParams: Promise<{
    search?: string;
    faculty?: string;
  }>;
}

export default async function AdminAttendeesPage({ searchParams }: AdminAttendeesPageProps) {
  await connectToDatabase();
  const resolved = await searchParams;

  const search = resolved.search?.trim() || "";
  const faculty = resolved.faculty?.trim() || "";

  const query: Record<string, unknown> = {
    role: "student",
  };

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { name: regex },
      { email: regex },
      { matricNumber: regex },
      { department: regex },
    ];
  }

  if (faculty && faculty !== "all") {
    query.faculty = buildFacultyQueryRegex(faculty);
  }

  // Find students matching query
  const students = await User.find(query)
    .select("name email matricNumber faculty department level")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const studentIds = students.map((s) => s._id);

  // Aggregate tickets for these students
  const ticketCounts = await Ticket.aggregate([
    {
      $match: {
        userId: { $in: studentIds },
        isInvalidated: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalPasses: { $sum: 1 },
      },
    },
  ]);

  const ticketMap = new Map<string, number>();
  ticketCounts.forEach((tc) => {
    ticketMap.set(tc._id.toString(), tc.totalPasses);
  });

  const totalAttendeesCount = await User.countDocuments({ role: "student" });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Platform Attendees Directory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          All university students registered for campus events across all faculties.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative flex items-center sm:col-span-2">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by student name, matric number, department..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex gap-2">
            <select
              name="faculty"
              defaultValue={faculty || "all"}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Faculties</option>
              {OAU_FACULTIES.map((fac) => (
                <option key={fac} value={fac}>
                  {formatFacultyLabel(fac)}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" className="h-10 px-4 rounded-xl text-xs font-semibold shrink-0">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      <div className="text-xs text-slate-500 px-1">
        Showing <strong>{students.length}</strong> of <strong>{totalAttendeesCount}</strong> registered OAU students
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          {students.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No attendees found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No registered students match your search criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3">Matric No.</th>
                  <th className="pb-3">University Email</th>
                  <th className="pb-3">Department & Level</th>
                  <th className="pb-3">Faculty</th>
                  <th className="pb-3 text-right">Confirmed Passes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => {
                  const passCount = ticketMap.get(st._id.toString()) || 0;

                  return (
                    <tr key={st._id.toString()} className="hover:bg-slate-50/60">
                      <td className="py-3.5 font-bold text-[#101C3A]">{st.name}</td>
                      <td className="py-3.5 font-mono text-slate-500">
                        {st.matricNumber || <span className="text-slate-300 italic">None</span>}
                      </td>
                      <td className="py-3.5 font-mono text-[11px] text-slate-500">{st.email}</td>
                      <td className="py-3.5 text-slate-600">
                        {st.department || "General"}
                        {st.level && <span className="block text-[11px] text-slate-400">{st.level} Level</span>}
                      </td>
                      <td className="py-3.5 text-slate-600 max-w-[180px] truncate">
                        {st.faculty ? formatFacultyLabel(st.faculty) : "Not Specified"}
                      </td>
                      <td className="py-3.5 text-right">
                        <Badge
                          variant={passCount > 0 ? "secondary" : "outline"}
                          className="font-bold text-[11px]"
                        >
                          {passCount} {passCount === 1 ? "pass" : "passes"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
