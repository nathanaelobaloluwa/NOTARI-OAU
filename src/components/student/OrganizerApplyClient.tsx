"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OAU_FACULTIES, formatFacultyLabel } from "@/constants/oau";
import {
  ORGANIZATION_CATEGORIES,
  APPLICATION_STATUS,
  ApplicantType,
  ApplicationStatus,
} from "@/constants/organizer";
import {
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";

interface ApplicationData {
  _id: string;
  applicantType: ApplicantType;
  status: ApplicationStatus;
  applicantName?: string;
  applicantEmail?: string;
  applicantMatricNumber?: string;
  faculty?: string;
  department?: string;
  phone?: string;
  displayName?: string;
  description?: string;
  reason?: string;
  experience?: string;
  supportingLinks?: string;
  organizationName?: string;
  organizationCategory?: string;
  organizationDescription?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonMatric?: string;
  contactPersonPhone?: string;
  officialEmail?: string;
  rejectionReason?: string;
  changesRequestedReason?: string;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
}

export function OrganizerApplyClient() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditingRevisions, setIsEditingRevisions] = useState(false);

  // Form State
  const [applicantType, setApplicantType] = useState<ApplicantType>("individual");

  // Individual Form Fields
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantMatricNumber, setApplicantMatricNumber] = useState("");
  const [individualFaculty, setIndividualFaculty] = useState("");
  const [individualDepartment, setIndividualDepartment] = useState("");
  const [individualPhone, setIndividualPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [individualBio, setIndividualBio] = useState("");
  const [individualReason, setIndividualReason] = useState("");
  const [individualExperience, setIndividualExperience] = useState("");
  const [individualLinks, setIndividualLinks] = useState("");

  // Organization Form Fields
  const [orgName, setOrgName] = useState("");
  const [orgCategory, setOrgCategory] = useState<string>(ORGANIZATION_CATEGORIES[0]);
  const [orgDescription, setOrgDescription] = useState("");
  const [orgFaculty, setOrgFaculty] = useState("");
  const [orgDepartment, setOrgDepartment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMatric, setContactMatric] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [orgReason, setOrgReason] = useState("");
  const [orgLinks, setOrgLinks] = useState("");

  // Fetch current application and student profile
  useEffect(() => {
    async function loadStatus() {
      try {
        setLoading(true);
        const res = await fetch("/api/organizer/apply");
        const data = await res.json();

        if (data.success && data.application) {
          setApplication(data.application);
          setHasProfile(data.hasProfile);

          // If changes requested, pre-fill form
          if (data.application.status === APPLICATION_STATUS.CHANGES_REQUESTED) {
            populateFormWithApplication(data.application);
          }
        } else {
          // Auto-fill from student session / profile if available
          if (session?.user) {
            setApplicantName(session.user.name || "");
            setApplicantEmail(session.user.email || "");
            setContactName(session.user.name || "");
            setContactEmail(session.user.email || "");
          }
        }
      } catch (err) {
        console.error("Failed to load application status:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [session]);

  function populateFormWithApplication(app: ApplicationData) {
    setApplicantType(app.applicantType);
    if (app.applicantType === "individual") {
      setApplicantName(app.applicantName || "");
      setApplicantEmail(app.applicantEmail || "");
      setApplicantMatricNumber(app.applicantMatricNumber || "");
      setIndividualFaculty(app.faculty || "");
      setIndividualDepartment(app.department || "");
      setIndividualPhone(app.phone || "");
      setDisplayName(app.displayName || "");
      setIndividualBio(app.description || "");
      setIndividualReason(app.reason || "");
      setIndividualExperience(app.experience || "");
      setIndividualLinks(app.supportingLinks || "");
    } else {
      setOrgName(app.organizationName || "");
      setOrgCategory(app.organizationCategory || ORGANIZATION_CATEGORIES[0]);
      setOrgDescription(app.organizationDescription || "");
      setOrgFaculty(app.faculty || "");
      setOrgDepartment(app.department || "");
      setContactName(app.contactPersonName || "");
      setContactEmail(app.contactPersonEmail || "");
      setContactMatric(app.contactPersonMatric || "");
      setContactPhone(app.contactPersonPhone || "");
      setOfficialEmail(app.officialEmail || "");
      setOrgReason(app.reason || "");
      setOrgLinks(app.supportingLinks || "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSubmitting(true);

    const payload =
      applicantType === "individual"
        ? {
            applicantType: "individual" as const,
            applicantName,
            applicantEmail,
            applicantMatricNumber: applicantMatricNumber || undefined,
            faculty: individualFaculty,
            department: individualDepartment,
            phone: individualPhone,
            displayName,
            description: individualBio,
            reason: individualReason,
            experience: individualExperience || undefined,
            supportingLinks: individualLinks || undefined,
          }
        : {
            applicantType: "organization" as const,
            organizationName: orgName,
            organizationCategory: orgCategory,
            organizationDescription: orgDescription,
            faculty: orgFaculty || undefined,
            department: orgDepartment || undefined,
            contactPersonName: contactName,
            contactPersonEmail: contactEmail,
            contactPersonMatric: contactMatric || undefined,
            contactPersonPhone: contactPhone,
            officialEmail: officialEmail || undefined,
            reason: orgReason,
            supportingLinks: orgLinks || undefined,
          };

    try {
      const res = await fetch("/api/organizer/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to submit application.");
        if (data.errors) {
          setFieldErrors(data.errors);
        }
        return;
      }

      setSuccessMessage(data.message);
      setApplication(data.application);
      setIsEditingRevisions(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-slate-200 rounded-md animate-pulse" />
        <Card className="p-8 space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        </Card>
      </div>
    );
  }

  // 1. STATE: APPROVED ORGANIZER
  if (application?.status === APPLICATION_STATUS.APPROVED || hasProfile) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card className="p-6 sm:p-8 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/30 to-white shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>Accreditation Active</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-notari-dark">
                You are an Accredited NOTARI 2.0 Event Organizer!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your application has been approved by the Obafemi Awolowo University Superadmin team.
                You can now host and manage campus events, publish ticketing tiers, and manage attendees.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Organizer / Brand Name</span>
                <span className="font-bold text-notari-dark">
                  {application?.displayName || application?.organizationName || session?.user?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Accreditation Category</span>
                <span className="font-semibold text-slate-700">
                  {application?.applicantType === "individual"
                    ? "Individual Student Organizer"
                    : application?.organizationCategory || "Campus Organization"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link href="/organizer" className="flex-1">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl gap-2 text-xs font-semibold shadow-sm">
                <span>Go to Organizer Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/organizer/profile" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl text-xs font-semibold border-slate-200">
                <span>Manage Public Profile</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 2. STATE: PENDING REVIEW
  if (application?.status === APPLICATION_STATUS.PENDING && !isEditingRevisions) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card className="p-6 sm:p-8 border-amber-200 bg-gradient-to-br from-white via-amber-50/20 to-white shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                <span>Pending Superadmin Review</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-notari-dark">
                Application Submitted & Under Review
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Thank you for applying to become an event organizer at Obafemi Awolowo University.
                Our administration is reviewing your details.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block font-medium">Applicant Type</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {application.applicantType === "individual"
                    ? "Individual Student Organizer"
                    : "Campus Organization"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Submitted On</span>
                <span className="font-semibold text-slate-800">
                  {new Date(application.createdAt).toLocaleDateString("en-NG", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Brand / Organization</span>
                <span className="font-bold text-notari-dark">
                  {application.displayName || application.organizationName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Submission Version</span>
                <span className="font-semibold text-slate-700">v{application.submissionCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50/60 p-4 border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <p className="font-semibold">What happens next?</p>
            <p className="text-indigo-700 leading-relaxed">
              Once approved, your account will gain instant access to the Organizer Dashboard without
              interrupting your existing student capabilities or ticket history.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/student">
              <Button variant="outline" className="rounded-xl text-xs font-semibold gap-1.5">
                <ChevronLeft className="w-4 h-4" />
                <span>Return to Student Dashboard</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 3. STATE: CHANGES REQUESTED (Shows revision banner and allows unlocking form)
  const isChangesRequested = application?.status === APPLICATION_STATUS.CHANGES_REQUESTED;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          {isChangesRequested ? "Update Organizer Application" : "Apply to Become an Event Organizer"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Obafemi Awolowo University Event Management Accreditation
        </p>
      </div>

      {/* Changes Requested Banner */}
      {isChangesRequested && (
        <Card className="p-5 border-amber-300 bg-amber-50/70 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Revisions Requested by Superadmin
              </span>
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                {application.changesRequestedReason ||
                  "Please update your application details according to the instructions below."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Rejection Notice Banner (if previous application was rejected) */}
      {application?.status === APPLICATION_STATUS.REJECTED && (
        <Card className="p-5 border-rose-200 bg-rose-50/60 space-y-2">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Previous Application Not Approved
              </span>
              <p className="text-xs text-rose-800">
                {application.rejectionReason || "Criteria not met."}
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                You may submit a fresh, revised application below addressing the feedback.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Global Form Alerts */}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Applicant Type */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            1. Select Your Organizer Category
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Individual Option */}
            <div
              onClick={() => setApplicantType("individual")}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                applicantType === "individual"
                  ? "border-notari-primary bg-indigo-50/50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    applicantType === "individual"
                      ? "bg-notari-primary text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                {applicantType === "individual" && (
                  <Badge className="bg-notari-primary text-white text-[10px]">Selected</Badge>
                )}
              </div>
              <div>
                <h3 className="font-bold text-notari-dark text-sm">Individual Student Organizer</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  For students organizing academic workshops, conferences, dinners, or creative events
                  independently.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-semibold text-indigo-600">
                ✓ No registered club or association required
              </div>
            </div>

            {/* Organization Option */}
            <div
              onClick={() => setApplicantType("organization")}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                applicantType === "organization"
                  ? "border-notari-primary bg-indigo-50/50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    applicantType === "organization"
                      ? "bg-notari-primary text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                {applicantType === "organization" && (
                  <Badge className="bg-notari-primary text-white text-[10px]">Selected</Badge>
                )}
              </div>
              <div>
                <h3 className="font-bold text-notari-dark text-sm">Campus Organization</h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  For official student associations, academic departments, Student Union, clubs, and societies.
                </p>
              </div>
              <div className="pt-2 text-[11px] font-semibold text-purple-600">
                ✓ Supports associations, departments & clubs
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Form Fields */}
        <Card className="p-6 sm:p-7 border-slate-200/90 bg-white space-y-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-notari-dark">
              {applicantType === "individual"
                ? "Individual Student Application Details"
                : "Campus Organization Application Details"}
            </h3>
            <p className="text-xs text-slate-400">
              Provide authentic university and contact information for accreditation.
            </p>
          </div>

          {applicantType === "individual" ? (
            /* --- INDIVIDUAL APPLICANT FIELDS --- */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="e.g. Adeola Johnson"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                  {fieldErrors.applicantName && (
                    <span className="text-[11px] text-rose-600 block">{fieldErrors.applicantName[0]}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">University Email *</label>
                  <input
                    type="email"
                    required
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="student@notari.oau.edu.ng"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                  {fieldErrors.applicantEmail && (
                    <span className="text-[11px] text-rose-600 block">{fieldErrors.applicantEmail[0]}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Matriculation Number</label>
                  <input
                    type="text"
                    value={applicantMatricNumber}
                    onChange={(e) => setApplicantMatricNumber(e.target.value)}
                    placeholder="e.g. CSC/2021/042"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={individualPhone}
                    onChange={(e) => setIndividualPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                  {fieldErrors.phone && (
                    <span className="text-[11px] text-rose-600 block">{fieldErrors.phone[0]}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Faculty *</label>
                  <select
                    required
                    value={individualFaculty}
                    onChange={(e) => setIndividualFaculty(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-notari-primary/20 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select Faculty</option>
                    {OAU_FACULTIES.map((fac) => (
                      <option key={fac} value={fac}>
                        {formatFacultyLabel(fac)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.faculty && (
                    <span className="text-[11px] text-rose-600 block">{fieldErrors.faculty[0]}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Department *</label>
                  <input
                    type="text"
                    required
                    value={individualDepartment}
                    onChange={(e) => setIndividualDepartment(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                  {fieldErrors.department && (
                    <span className="text-[11px] text-rose-600 block">{fieldErrors.department[0]}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Organizer Display Name or Event Brand *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ife Tech Circles or Adeola Johnson Events"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 block">
                  This public name will appear on tickets, posters, and your organizer portal.
                </span>
                {fieldErrors.displayName && (
                  <span className="text-[11px] text-rose-600 block">{fieldErrors.displayName[0]}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Short Biography / Organizer Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={individualBio}
                  onChange={(e) => setIndividualBio(e.target.value)}
                  placeholder="Tell students about your focus, target audience, and event mission (at least 20 characters)..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Minimum 20 characters</span>
                  <span>{individualBio.length} / 1000</span>
                </div>
                {fieldErrors.description && (
                  <span className="text-[11px] text-rose-600 block">{fieldErrors.description[0]}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Why do you want to become a NOTARI organizer? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={individualReason}
                  onChange={(e) => setIndividualReason(e.target.value)}
                  placeholder="Explain what kind of events you plan to bring to Great Ife students (at least 20 characters)..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                />
                {fieldErrors.reason && (
                  <span className="text-[11px] text-rose-600 block">{fieldErrors.reason[0]}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Past Event Experience (Optional)
                  </label>
                  <input
                    type="text"
                    value={individualExperience}
                    onChange={(e) => setIndividualExperience(e.target.value)}
                    placeholder="e.g. Organized departmental debate 2024"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Social Media or Portfolio Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={individualLinks}
                    onChange={(e) => setIndividualLinks(e.target.value)}
                    placeholder="e.g. twitter.com/adeola_events or linkedin.com/in/..."
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* --- CAMPUS ORGANIZATION FIELDS --- */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Official Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. OAU Tech Innovation Club"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                  {fieldErrors.organizationName && (
                    <span className="text-[11px] text-rose-600 block">{fieldErrors.organizationName[0]}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Organization Category *</label>
                  <select
                    required
                    value={orgCategory}
                    onChange={(e) => setOrgCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-notari-primary/20 focus:outline-none cursor-pointer"
                  >
                    {ORGANIZATION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Organization Description & Mission *</label>
                <textarea
                  required
                  rows={3}
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder="Describe your organization's goals, activities, and campus presence (at least 20 characters)..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Minimum 20 characters</span>
                  <span>{orgDescription.length} / 1000</span>
                </div>
                {fieldErrors.organizationDescription && (
                  <span className="text-[11px] text-rose-600 block">{fieldErrors.organizationDescription[0]}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Faculty (Where Applicable)</label>
                  <select
                    value={orgFaculty}
                    onChange={(e) => setOrgFaculty(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-notari-primary/20 focus:outline-none cursor-pointer"
                  >
                    <option value="">Cross-Campus / All Faculties</option>
                    {OAU_FACULTIES.map((fac) => (
                      <option key={fac} value={fac}>
                        {formatFacultyLabel(fac)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Department (Where Applicable)</label>
                  <input
                    type="text"
                    value={orgDepartment}
                    onChange={(e) => setOrgDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contact Person Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Designated Representative Contact
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Representative Name *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Bamidele Adebayo"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                    />
                    {fieldErrors.contactPersonName && (
                      <span className="text-[11px] text-rose-600 block">{fieldErrors.contactPersonName[0]}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Representative OAU Email *</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="bamidele@notari.oau.edu.ng"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                    />
                    {fieldErrors.contactPersonEmail && (
                      <span className="text-[11px] text-rose-600 block">{fieldErrors.contactPersonEmail[0]}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Representative Phone *</label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                    />
                    {fieldErrors.contactPersonPhone && (
                      <span className="text-[11px] text-rose-600 block">{fieldErrors.contactPersonPhone[0]}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Representative Matric No. (Optional)</label>
                    <input
                      type="text"
                      value={contactMatric}
                      onChange={(e) => setContactMatric(e.target.value)}
                      placeholder="e.g. CSC/2020/0912"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Official Org Email (If Available)
                  </label>
                  <input
                    type="email"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    placeholder="club@oau.edu.ng (optional)"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 block">
                    Organizations without official domain email may apply using the representative&apos;s verified account.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Website or Social Links (Optional)</label>
                  <input
                    type="text"
                    value={orgLinks}
                    onChange={(e) => setOrgLinks(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Reason for Requesting Organizer Access *
                </label>
                <textarea
                  required
                  rows={3}
                  value={orgReason}
                  onChange={(e) => setOrgReason(e.target.value)}
                  placeholder="Provide background on the events your organization intends to host at OAU..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-notari-primary/20 focus:outline-none"
                />
                {fieldErrors.reason && (
                  <span className="text-[11px] text-rose-600 block">{fieldErrors.reason[0]}</span>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Applications are reviewed by the Great Ife platform administration.
            </span>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 h-11 rounded-xl bg-notari-primary hover:bg-indigo-700 text-xs font-semibold gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : isChangesRequested ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Revised Application</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Application for Review</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

