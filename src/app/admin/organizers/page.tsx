import React from "react";
import { Metadata } from "next";
import { connectToDatabase } from "@/lib/database/mongoose";
import { OrganizerProfile } from "@/models/OrganizerProfile";
import { Event } from "@/models/Event";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";
import { Building } from "lucide-react";

export const metadata: Metadata = {
  title: "Organizers Management | NOTARI 2.0 Superadmin",
  description: "Accredited student associations, departmental committees, and campus event hosts.",
};

export default async function AdminOrganizersPage() {
  await connectToDatabase();

  const profiles = await OrganizerProfile.find()
    .populate("userId", "name email role isOrganizer")
    .sort({ createdAt: -1 })
    .lean();

  // Fetch event counts for each organizer in parallel
  const organizerRows = await Promise.all(
    profiles.map(async (profile) => {
      const eventCount = await Event.countDocuments({
        organizerId: profile.userId,
      });

      return {
        _id: profile._id.toString(),
        name: profile.displayName || profile.organizationName,
        legalName: profile.organizationName,
        repName:
          (profile.userId as { name?: string })?.name || profile.displayName || "Representative",
        repEmail:
          (profile.userId as { email?: string })?.email || profile.contactEmail,
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        category: profile.category,
        organizerType: profile.organizerType || "organization",
        faculty: profile.faculty || "University-wide",
        department: profile.department || "N/A",
        status: profile.status,
        eventCount,
        approvedAt: profile.approvedAt,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Organizers Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Accredited student associations, departmental committees, and independent campus event hosts.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
        {organizerRows.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Building className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-notari-dark">No Accredited Organizers Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Submitted applications will appear here once approved in the Approvals Queue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Organization / Brand</th>
                  <th className="pb-3">Category & Type</th>
                  <th className="pb-3">Representative</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Hosted Events</th>
                  <th className="pb-3">Accreditation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizerRows.map((org) => (
                  <tr key={org._id} className="hover:bg-slate-50/60">
                    <td className="py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#101C3A] block">{org.name}</span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                          {org.department !== "N/A" ? `${org.department} • ` : ""}
                          {org.faculty}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <Badge variant="subtle" className="text-[11px] font-medium capitalize">
                        {org.organizerType === "individual" ? "Individual Student" : org.category}
                      </Badge>
                    </td>
                    <td className="py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-700 block">{org.repName}</span>
                        <span className="text-[11px] text-slate-400 block">{org.repEmail}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="space-y-0.5 text-slate-500">
                        <span className="block truncate max-w-[160px]">{org.contactEmail}</span>
                        <span className="text-[11px] text-slate-400 block">{org.contactPhone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-blue-600">
                      {org.eventCount} {org.eventCount === 1 ? "event" : "events"}
                    </td>
                    <td className="py-3.5">
                      <StatusPill status={org.status === "approved" ? "active" : org.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
