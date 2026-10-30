"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_CATEGORIES, OAU_FACULTIES, OAU_VENUES } from "@/constants/oau";
import { ArrowLeft, Upload, Check } from "lucide-react";

export default function AdminCreateEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [category, setCategory] = useState("");
  const [faculty, setFaculty] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/admin/events");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Events Management</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Create New Event
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Superadmin event publishing form with immediate publication bypass.
        </p>
      </div>

      <Card className="p-6 sm:p-8 border-slate-200/80 bg-white shadow-xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Event Title *</label>
            <Input
              placeholder="e.g. OAU Tech Summit 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Official Organizer Name *</label>
              <Input
                placeholder="e.g. OAU Computer Science Dept."
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Event Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="">Select Category</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Start Date & Time *</label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">End Date & Time *</label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Faculty (Optional)</label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Campus-wide / All Faculties</option>
                {OAU_FACULTIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Campus Venue *</label>
              <select
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="">Select an OAU Campus Venue</option>
                {OAU_VENUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Event Description *</label>
            <textarea
              rows={4}
              placeholder="Full description of the event, itinerary, and guest speakers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-notari-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link href="/admin/events">
              <Button type="button" variant="outline" className="rounded-xl text-xs">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-6 text-xs font-semibold shadow-xs"
            >
              Publish Event Immediately
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
