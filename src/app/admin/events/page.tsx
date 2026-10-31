import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { PlusCircle, Search } from "lucide-react";

export default function AdminEventsManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            Events Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Superadmin directory of all scheduled, pending, published, and archived OAU events.
          </p>
        </div>

        <Link href="/admin/events/create">
          <Button className="rounded-xl px-4 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-xs">
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200/80 bg-white shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event title, organizer..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">All Statuses (Published, Pending, Draft)</option>
              <option value="published">Published</option>
              <option value="pending">Pending Approval</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <select className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">All Categories</option>
              <option value="tech">Tech & Innovation</option>
              <option value="arts">Arts & Culture</option>
              <option value="music">Music & Concerts</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Mobile Events Cards (< md) */}
      <div className="space-y-3 md:hidden">
        {MOCK_EVENTS.map((evt) => (
          <Card key={evt.id} className="p-4 border-slate-200/80 bg-white shadow-xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-[#101C3A] truncate">{evt.title}</h3>
                <p className="text-xs text-slate-400 truncate">{evt.organizer}</p>
              </div>
              <StatusPill status={evt.status} />
            </div>

            <div className="text-xs text-slate-500 space-y-0.5">
              <p>{evt.date} • {evt.venue}</p>
              <p className="text-slate-400 text-[11px] font-medium">Capacity: {evt.registered} / {evt.capacity} registered</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <Link href={`/events/${evt.slug}`} className="text-slate-400 hover:text-slate-600 font-medium text-[11px]">
                Public Preview
              </Link>
              <Link href={`/admin/events/${evt.id}`}>
                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-blue-600 border-blue-200">
                  Manage Event
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Events Table (>= md) */}
      <Card className="hidden md:block p-6 border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Event Title</th>
                <th className="pb-3">Organizer</th>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Capacity</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_EVENTS.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 font-bold text-[#101C3A] max-w-[180px] truncate">
                    {evt.title}
                  </td>
                  <td className="py-3.5 text-slate-500 max-w-[140px] truncate">{evt.organizer}</td>
                  <td className="py-3.5 text-slate-500 text-[11px]">{evt.date} • {evt.time.split("-")[0]}</td>
                  <td className="py-3.5 text-slate-600 truncate max-w-[140px]">{evt.venue}</td>
                  <td className="py-3.5 text-slate-700 font-medium">{evt.registered} / {evt.capacity}</td>
                  <td className="py-3.5">
                    <StatusPill status={evt.status} />
                  </td>
                  <td className="py-3.5 text-right space-x-2">
                    <Link href={`/admin/events/${evt.id}`}>
                      <button className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]">
                        Edit
                      </button>
                    </Link>
                    <Link href={`/events/${evt.slug}`}>
                      <button className="text-slate-400 hover:text-slate-600 font-semibold text-[11px]">
                        Preview
                      </button>
                    </Link>
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
