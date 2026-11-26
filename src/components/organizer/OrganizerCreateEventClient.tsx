"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EVENT_CATEGORIES,
  OAU_FACULTIES,
  formatFacultyLabel,
  OAU_VENUES,
  EVENT_STATUS,
} from "@/constants/oau";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Ticket,
  AlertTriangle,
  RefreshCw,
  Info,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventFlyerUploader } from "@/components/organizer/EventFlyerUploader";

interface FormTicketTier {
  name: string;
  price: number;
  capacity: number;
  description?: string;
  maxPerOrder: number;
}

const OAU_CAMPUS_PRESETS = [
  { label: "Oduduwa Hall", url: "/images/oau/oau-oduduwa-hall.jpg" },
  { label: "Amphitheatre Stage", url: "/images/oau/oau-amphitheatre-stage.jpg" },
  { label: "Senate Building", url: "/images/oau/oau-senate-building.png" },
  { label: "Matriculation Gathering", url: "/images/oau/oau-matriculation-crowd.jpg" },
];

export function OrganizerCreateEventClient() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // 1. Basic Information
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [eventType, setEventType] = useState<"physical" | "online" | "hybrid">("physical");
  const [targetAudience, setTargetAudience] = useState("");

  // 2. Schedule & Location
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [customVenue, setCustomVenue] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [onlinePlatform, setOnlinePlatform] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [onlineAccessInfo, setOnlineAccessInfo] = useState("");

  // 3. Ticketing
  const [isFree, setIsFree] = useState(true);
  const [ticketTiers, setTicketTiers] = useState<FormTicketTier[]>([
    {
      name: "General Admission",
      price: 0,
      capacity: 100,
      description: "Standard free student access pass",
      maxPerOrder: 5,
    },
  ]);

  // 4. Media & Additional
  const [flyerUrl, setFlyerUrl] = useState(OAU_CAMPUS_PRESETS[0].url);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const totalCapacity = ticketTiers.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0);

  const handleAddTier = () => {
    setTicketTiers((prev) => [
      ...prev,
      {
        name: isFree ? `Tier ${prev.length + 1}` : "VIP Pass",
        price: isFree ? 0 : 2000,
        capacity: 50,
        description: "",
        maxPerOrder: 5,
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (ticketTiers.length <= 1) return;
    setTicketTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof FormTicketTier, value: string | number) => {
    setTicketTiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleTogglePricing = (freeMode: boolean) => {
    setIsFree(freeMode);
    if (freeMode) {
      setTicketTiers((prev) =>
        prev.map((t) => ({
          ...t,
          price: 0,
        }))
      );
    }
  };

  const handleSave = async (submitStatus: typeof EVENT_STATUS.DRAFT | typeof EVENT_STATUS.PENDING_APPROVAL) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const chosenVenue = venue === "other" || !venue ? customVenue : venue;

    const payload = {
      title,
      summary: summary || undefined,
      description,
      category,
      eventType,
      venue: chosenVenue,
      faculty: faculty || undefined,
      department: department || undefined,
      onlineDetails:
        eventType !== "physical"
          ? {
              platform: onlinePlatform || undefined,
              link: onlineLink || undefined,
              accessInfo: onlineAccessInfo || undefined,
            }
          : undefined,
      targetAudience: targetAudience || undefined,
      tags: tagsInput
        ? tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      instructions: instructions || undefined,
      startDate,
      endDate,
      flyerUrl: flyerUrl || undefined,
      isFree,
      ticketTiers: ticketTiers.map((t) => ({
        name: t.name,
        price: isFree ? 0 : Number(t.price),
        capacity: Number(t.capacity),
        description: t.description || undefined,
        maxPerOrder: Number(t.maxPerOrder) || 5,
      })),
      status: submitStatus,
    };

    try {
      const res = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to create event.");
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        setSubmitting(false);
        return;
      }

      router.push("/organizer/events");
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Basic Information" },
    { num: 2, title: "Date & Location" },
    { num: 3, title: "Ticket Tiers" },
    { num: 4, title: "Media & Review" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/organizer/events"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
            Create Campus Event
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish or draft an official event for Great Ife students and attendees.
          </p>
        </div>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-4">
        {steps.map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setCurrentStep(s.num as 1 | 2 | 3 | 4)}
            className={cn(
              "text-left pb-2 border-b-2 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
              currentStep === s.num
                ? "border-[#4F46E5] text-[#4F46E5]"
                : currentStep > s.num
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                currentStep === s.num
                  ? "bg-[#4F46E5] text-white"
                  : currentStep > s.num
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600"
              )}
            >
              {s.num}
            </span>
            <span className="hidden sm:inline truncate">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Error Callout */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">{errorMessage}</span>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-600">
                {Object.entries(fieldErrors).map(([field, msgs]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {msgs.join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* STEP 1: BASIC INFORMATION */}
      {currentStep === 1 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 bg-white space-y-6 shadow-xs rounded-2xl">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Event Title *</label>
            <Input
              placeholder="e.g. Great Ife Tech Summit 2026: Building for Africa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs"
              required
            />
            {fieldErrors.title && (
              <span className="text-[11px] text-rose-600">{fieldErrors.title[0]}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Short Summary (Optional)</label>
            <Input
              placeholder="One-line tagline or brief overview for discovery cards..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="text-xs"
              maxLength={250}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-[#101C3A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 cursor-pointer"
                required
              >
                <option value="">Select Category</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <span className="text-[11px] text-rose-600">{fieldErrors.category[0]}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Event Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(["physical", "online", "hybrid"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={cn(
                      "h-11 rounded-xl border text-xs font-semibold capitalize transition-all",
                      eventType === type
                        ? "border-[#4F46E5] bg-indigo-50 text-[#4F46E5]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Full Description *</label>
            <textarea
              rows={5}
              placeholder="Provide a comprehensive description of the event agenda, keynote speakers, learning outcomes, and expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-[#101C3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
              required
            />
            {fieldErrors.description && (
              <span className="text-[11px] text-rose-600">{fieldErrors.description[0]}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Target Audience (Optional)</label>
            <Input
              placeholder="e.g. All undergraduate students, Tech enthusiasts, Pharmacy finals..."
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="bg-[#4F46E5] hover:bg-indigo-700 rounded-xl px-6 text-xs font-semibold gap-1.5 shadow-sm"
            >
              <span>Next: Date & Location</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: SCHEDULE & LOCATION */}
      {currentStep === 2 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 bg-white space-y-6 shadow-xs rounded-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Start Date & Time *</label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
                required
              />
              {fieldErrors.startDate && (
                <span className="text-[11px] text-rose-600">{fieldErrors.startDate[0]}</span>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">End Date & Time *</label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
                required
              />
              {fieldErrors.endDate && (
                <span className="text-[11px] text-rose-600">{fieldErrors.endDate[0]}</span>
              )}
            </div>
          </div>

          {/* Venue Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700">Campus Venue / Location *</label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-[#101C3A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 cursor-pointer"
              required
            >
              <option value="">Select an OAU Campus Venue</option>
              {OAU_VENUES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
              <option value="other">Other / Custom Campus Location</option>
            </select>

            {(venue === "other" || !venue) && (
              <Input
                placeholder="Enter custom campus location or hall name..."
                value={customVenue}
                onChange={(e) => setCustomVenue(e.target.value)}
                className="text-xs mt-2"
              />
            )}
            {fieldErrors.venue && (
              <span className="text-[11px] text-rose-600">{fieldErrors.venue[0]}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Faculty Association (Optional)</label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-[#101C3A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 cursor-pointer"
              >
                <option value="">University-wide / All Faculties</option>
                {OAU_FACULTIES.map((f) => (
                  <option key={f} value={f}>
                    {formatFacultyLabel(f)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Department (Optional)</label>
              <Input
                placeholder="e.g. Computer Science, Medicine, Law..."
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Online Details (if online or hybrid) */}
          {eventType !== "physical" && (
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <Info className="w-4 h-4 text-purple-600" />
                <span>Online Meeting Details</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Access links remain private and are only shown to registered attendees with verified passes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Platform (e.g. Google Meet, Zoom, YouTube Live)"
                  value={onlinePlatform}
                  onChange={(e) => setOnlinePlatform(e.target.value)}
                  className="text-xs bg-white"
                />
                <Input
                  placeholder="Meeting Link / URL (e.g. https://meet.google.com/...)"
                  value={onlineLink}
                  onChange={(e) => setOnlineLink(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>
              <Input
                placeholder="Passcode or access instructions (optional)"
                value={onlineAccessInfo}
                onChange={(e) => setOnlineAccessInfo(e.target.value)}
                className="text-xs bg-white"
              />
            </div>
          )}

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
              className="bg-[#4F46E5] hover:bg-indigo-700 rounded-xl px-6 text-xs font-semibold gap-1.5 shadow-sm"
            >
              <span>Next: Ticket Tiers</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: TICKET TIERS */}
      {currentStep === 3 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 bg-white space-y-6 shadow-xs rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#101C3A]">Configure Event Ticket Tiers</h3>
              <p className="text-xs text-slate-500">
                Setup admission tiers, seat limits, and ticket quantities.
              </p>
            </div>

            {/* Total Capacity Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shrink-0">
              <Ticket className="w-3.5 h-3.5" />
              <span>Total Capacity: {totalCapacity} spots</span>
            </div>
          </div>

          {/* Free vs Paid Toggle */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTogglePricing(true)}
              className={cn(
                "py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                isFree
                  ? "bg-white text-[#101C3A] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Ticket className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Free Admission</span>
            </button>
            <button
              type="button"
              onClick={() => handleTogglePricing(false)}
              className={cn(
                "py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                !isFree
                  ? "bg-white text-[#101C3A] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Ticket className="w-3.5 h-3.5 text-purple-600" />
              <span>Paid Tickets (Paystack)</span>
            </button>
          </div>

          {!isFree && (
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-purple-600 mt-0.5" />
              <div>
                <strong className="font-semibold block">Notice on Paid Tickets:</strong>
                <span>
                  Paid tier pricing can be configured and saved in this phase. Live Paystack payment checkout will be activated in the subsequent payment phase.
                </span>
              </div>
            </div>
          )}

          {/* Ticket Tier Cards */}
          <div className="space-y-4">
            {ticketTiers.map((tier, idx) => (
              <Card
                key={idx}
                className="p-4 sm:p-5 border-slate-200/90 bg-slate-50/50 space-y-4 rounded-xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-700">
                    Tier #{idx + 1}
                  </span>
                  {ticketTiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-slate-600">Tier Name *</label>
                    <Input
                      placeholder="e.g. Regular, Early Bird, VIP"
                      value={tier.name}
                      onChange={(e) => handleTierChange(idx, "name", e.target.value)}
                      className="text-xs bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Price (NGN) {isFree && "(Locked to ₦0)"}
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={isFree ? 0 : tier.price}
                      disabled={isFree}
                      onChange={(e) => handleTierChange(idx, "price", Math.max(0, Number(e.target.value)))}
                      className="text-xs bg-white disabled:bg-slate-100"
                      min={0}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Available Quantity *</label>
                    <Input
                      type="number"
                      placeholder="e.g. 100"
                      value={tier.capacity}
                      onChange={(e) => handleTierChange(idx, "capacity", Math.max(1, Number(e.target.value)))}
                      className="text-xs bg-white"
                      min={1}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600">Tier Description (Optional)</label>
                    <Input
                      placeholder="e.g. Front row seating, includes event materials..."
                      value={tier.description || ""}
                      onChange={(e) => handleTierChange(idx, "description", e.target.value)}
                      className="text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Max Per Order</label>
                    <Input
                      type="number"
                      value={tier.maxPerOrder}
                      onChange={(e) => handleTierChange(idx, "maxPerOrder", Math.max(1, Number(e.target.value)))}
                      className="text-xs bg-white"
                      min={1}
                      max={10}
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddTier}
              className="w-full text-xs font-semibold rounded-xl border-dashed border-slate-300 hover:bg-slate-50 gap-1.5"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Add Another Ticket Tier</span>
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
              className="bg-[#4F46E5] hover:bg-indigo-700 rounded-xl px-6 text-xs font-semibold gap-1.5 shadow-sm"
            >
              <span>Next: Media & Review</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: MEDIA & REVIEW */}
      {currentStep === 4 && (
        <Card className="p-6 sm:p-8 border-slate-200/80 bg-white space-y-6 shadow-xs rounded-2xl">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#101C3A]">Publicity Flyer & Review</h3>
            <p className="text-xs text-slate-500">
              Upload a high-resolution flyer from your device (JPEG, PNG, or WebP up to 5 MB) or select an authentic Great Ife campus preset.
            </p>
          </div>

          {/* Event Flyer Uploader Component */}
          <EventFlyerUploader
            value={flyerUrl}
            onChange={(url) => setFlyerUrl(url)}
            presets={OAU_CAMPUS_PRESETS}
          />

          {/* Additional details: contact & tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Public Contact Email (Optional)</label>
              <Input
                type="email"
                placeholder="contact@yourevent.oau.edu.ng"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Public Contact Phone (Optional)</label>
              <Input
                placeholder="08012345678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Event Instructions / Gate Rules (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Dress code is formal, students must present student ID card alongside digital QR ticket..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-[#101C3A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Search Tags (Comma-separated)</label>
            <Input
              placeholder="technology, conference, engineering, hackathon"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Review Summary Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-[#101C3A] pb-2 border-b border-slate-200/80 flex items-center justify-between">
              <span>Event Summary</span>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {category || "Category Pending"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 block text-[11px]">Title</span>
                <span className="font-bold text-[#101C3A] truncate block">{title || "Untitled Event"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Venue</span>
                <span className="font-medium text-[#101C3A]">{venue === "other" || !venue ? customVenue || "TBD" : venue}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Admission</span>
                <span className="font-bold text-emerald-600">{isFree ? "Free Admission" : "Paid Event"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Capacity</span>
                <span className="font-bold text-[#101C3A]">{totalCapacity} Total Seats</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Note: Submitting for review routes your event to the Superadmin approvals queue. Once approved, it will be published immediately on the public OAU events portal.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(3)}
              disabled={submitting}
              className="rounded-xl text-xs"
            >
              Back
            </Button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave(EVENT_STATUS.DRAFT)}
                disabled={submitting}
                className="rounded-xl text-xs border-slate-300 font-semibold"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                <span>Save Incomplete Draft</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleSave(EVENT_STATUS.PENDING_APPROVAL)}
                disabled={submitting}
                className="bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
              >
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Submit for Superadmin Review</span>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

