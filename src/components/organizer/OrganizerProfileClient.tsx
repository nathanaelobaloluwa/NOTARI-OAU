"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OAU_FACULTIES, formatFacultyLabel } from "@/constants/oau";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Calendar,
} from "lucide-react";

interface ProfileData {
  _id: string;
  userId: string;
  organizerType?: "individual" | "organization";
  organizationName: string;
  displayName?: string;
  category: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  faculty?: string;
  department?: string;
  website?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  approvalNotes?: string;
  approvedAt?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function OrganizerProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await fetch("/api/organizer/profile");
        const data = await res.json();

        if (data.success && data.profile) {
          setProfile(data.profile);
          setDisplayName(data.profile.displayName || data.profile.organizationName || "");
          setOrganizationName(data.profile.organizationName || "");
          setDescription(data.profile.description || "");
          setContactEmail(data.profile.contactEmail || "");
          setContactPhone(data.profile.contactPhone || "");
          setFaculty(data.profile.faculty || "");
          setDepartment(data.profile.department || "");
          setWebsite(data.profile.website || "");
          setTwitter(data.profile.socialLinks?.twitter || "");
          setInstagram(data.profile.socialLinks?.instagram || "");
          setLinkedin(data.profile.socialLinks?.linkedin || "");
        } else {
          setErrorMessage(data.message || "Failed to load organizer profile.");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setErrorMessage("Network error loading profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setSaving(true);

    const payload = {
      displayName: displayName.trim() || undefined,
      organizationName: organizationName.trim() || undefined,
      description: description.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      contactPhone: contactPhone.trim(),
      faculty: faculty.trim() || undefined,
      department: department.trim() || undefined,
      website: website.trim() || undefined,
      socialLinks: {
        twitter: twitter.trim() || undefined,
        instagram: instagram.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
      },
    };

    try {
      const res = await fetch("/api/organizer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to update profile.");
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        return;
      }

      setProfile(data.profile);
      setSuccessMessage("Organizer profile updated and saved to MongoDB successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error saving profile:", err);
      setErrorMessage("Network error saving profile changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 w-60 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-slate-200 rounded-md animate-pulse" />
        <Card className="p-8 space-y-4">
          <div className="h-16 w-16 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-4 bg-slate-100 rounded-md animate-pulse" />
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Card className="p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-notari-dark">No Active Organizer Profile Found</h2>
          <p className="text-xs text-slate-500">
            {errorMessage || "You must be an accredited organizer to access this page."}
          </p>
        </Card>
      </div>
    );
  }

  const initials =
    (profile.displayName || profile.organizationName || "CO")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CO";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Organizer Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official details displayed to students and verified by Great Ife Superadmins.
        </p>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <Card className="p-6 border-slate-200/80 bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl shrink-0">
              {initials}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-bold text-notari-dark text-lg sm:text-xl truncate">
                {profile.displayName || profile.organizationName}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {[profile.department, profile.faculty].filter(Boolean).join(" • ") || profile.category}
              </p>
              <div className="pt-0.5">
                <span className="text-[11px] font-medium text-slate-400 capitalize">
                  Type: {profile.organizerType === "individual" ? "Individual Student Organizer" : "Campus Organization"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Accredited Organizer</span>
            </span>
            {profile.approvedAt && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  Approved {new Date(profile.approvedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Read-Only Administrative Info Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Accreditation Verification</span>
          </div>
          <p className="leading-relaxed">
            Status: <strong className="text-emerald-700 uppercase">{profile.status}</strong>. Administrative
            status and review records are securely governed by Superadmin policy and cannot be altered from this panel.
          </p>
        </div>

        {/* Editable Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Display / Brand Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Public brand or organizer display name"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
              />
              {fieldErrors.displayName && (
                <span className="text-[11px] text-rose-600 block">{fieldErrors.displayName[0]}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Organization Legal / Official Name</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Official registered name"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
              />
              {fieldErrors.organizationName && (
                <span className="text-[11px] text-rose-600 block">{fieldErrors.organizationName[0]}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Official Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="organizer@notari.oau.edu.ng"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
              />
              {fieldErrors.contactEmail && (
                <span className="text-[11px] text-rose-600 block">{fieldErrors.contactEmail[0]}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Phone Number</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+234..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
              />
              {fieldErrors.contactPhone && (
                <span className="text-[11px] text-rose-600 block">{fieldErrors.contactPhone[0]}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Faculty</label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-purple-600/20 focus:outline-none cursor-pointer"
              >
                <option value="">Select Faculty (or University-wide)</option>
                {OAU_FACULTIES.map((fac) => (
                  <option key={fac} value={fac}>
                    {formatFacultyLabel(fac)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Public About & Mission</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your organization's mission and event focus..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-notari-dark focus:outline-none focus:ring-2 focus:ring-purple-600/20"
            />
            {fieldErrors.description && (
              <span className="text-[11px] text-rose-600 block">{fieldErrors.description[0]}</span>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Website & Social Profiles
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Twitter / X Handle</label>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@handle"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Instagram Handle</label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@handle"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-600/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving to MongoDB...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

