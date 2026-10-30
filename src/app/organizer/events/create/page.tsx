"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_CATEGORIES, OAU_FACULTIES, OAU_VENUES } from "@/constants/oau";
import {
  Upload,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrganizerCreateEventPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [faculty, setFaculty] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  // Ticketing states
  const [isFree, setIsFree] = useState(true);
  const [ticketPrice, setTicketPrice] = useState("0");
  const [capacity, setCapacity] = useState("200");

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      router.push("/organizer/events");
    }, 1500);
  };

  const steps = [
    { num: 1, title: "Basic Info" },
    { num: 2, title: "Ticketing" },
    { num: 3, title: "Media & Flyer" },
    { num: 4, title: "Review & Publish" },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Create New Event
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure your campus event details, ticketing rules, and publicity flyer.
        </p>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-4">
        {steps.map((s) => (
          <button
            key={s.num}
            onClick={() => setCurrentStep(s.num as 1 | 2 | 3 | 4)}
            className={cn(
              "text-left pb-2 border-b-2 text-xs font-semibold transition-all flex items-center gap-1.5",
              currentStep === s.num
                ? "border-purple-600 text-purple-600"
                : currentStep > s.num
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                currentStep === s.num
                  ? "bg-purple-600 text-white"
                  : currentStep > s.num
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600"
              )}
            >
              {s.num}
            </span>
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: BASIC INFO */}
      {currentStep === 1 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 shadow-sm bg-white space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Event Title *</label>
            <Input
              placeholder="e.g. OAU Tech Summit 2025: Innovation on Campus"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Event Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:ring-2 focus:ring-purple-600/20"
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Hosting Faculty (Optional)</label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:ring-2 focus:ring-purple-600/20"
              >
                <option value="">Campus-wide / All Faculties</option>
                {OAU_FACULTIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Campus Venue / Location *</label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:ring-2 focus:ring-purple-600/20"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Description *</label>
            <textarea
              rows={4}
              placeholder="Describe your event, speaker lineup, prerequisites, and what attendees should expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-notari-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
              required
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6 text-xs font-semibold gap-1.5"
            >
              <span>Next: Ticketing</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: TICKETING */}
      {currentStep === 2 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 shadow-sm bg-white space-y-6">
          <h3 className="text-base font-bold text-notari-dark">Configure Event Tickets</h3>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="free"
                name="pricing"
                checked={isFree}
                onChange={() => setIsFree(true)}
                className="text-purple-600 focus:ring-purple-600"
              />
              <label htmlFor="free" className="text-xs font-bold text-slate-700 cursor-pointer">
                Free Admission
              </label>
            </div>

            <div className="flex items-center gap-2 ml-6">
              <input
                type="radio"
                id="paid"
                name="pricing"
                checked={!isFree}
                onChange={() => setIsFree(false)}
                className="text-purple-600 focus:ring-purple-600"
              />
              <label htmlFor="paid" className="text-xs font-bold text-slate-700 cursor-pointer">
                Paid Ticket (Paystack)
              </label>
            </div>
          </div>

          {!isFree && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Ticket Price (NGN) *</label>
              <Input
                type="number"
                placeholder="e.g. 1500"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                icon={<DollarSign className="w-4 h-4" />}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Total Hall Capacity / Seats *</label>
            <Input
              type="number"
              placeholder="e.g. 300"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="rounded-xl text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6 text-xs font-semibold gap-1.5"
            >
              <span>Next: Media</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: MEDIA & FLYER */}
      {currentStep === 3 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 shadow-sm bg-white space-y-6">
          <h3 className="text-base font-bold text-notari-dark">Upload Event Publicity Flyer</h3>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3 hover:border-purple-400 transition-colors cursor-pointer bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-notari-dark">Click to upload or drag flyer here</p>
              <p className="text-[11px] text-slate-400">PNG, JPG, or WEBP (Max 5MB • 16:9 recommended)</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs rounded-lg mt-2">
              Browse Files
            </Button>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="rounded-xl text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6 text-xs font-semibold gap-1.5"
            >
              <span>Review Details</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {currentStep === 4 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 shadow-sm bg-white space-y-6">
          <h3 className="text-base font-bold text-notari-dark">Review Event Submission</h3>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl text-xs text-slate-600 border border-slate-100">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Title:</span>
              <span className="font-bold text-notari-dark">{title || "OAU Tech Summit 2025"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Category:</span>
              <span>{category || "Tech & Innovation"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Venue:</span>
              <span>{venue || "Oduduwa Hall"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Admission:</span>
              <span className="font-bold text-emerald-600">
                {isFree ? "Free Admission" : `₦${ticketPrice}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-500">Capacity:</span>
              <span>{capacity} Seats</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Note: All events submitted by campus organizers require superadmin approval before appearing publicly on the OAU event feed.
          </p>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(3)}
              className="rounded-xl text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl px-6 text-xs font-semibold"
            >
              {isSubmitted ? "Submitting for Approval..." : "Submit Event for Approval"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
