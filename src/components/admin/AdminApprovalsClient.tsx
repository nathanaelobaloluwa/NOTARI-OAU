"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Application {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
    matricNumber?: string;
    faculty?: string;
    department?: string;
    phone?: string;
  };
  applicantType: "individual" | "organization";
  status: "pending" | "approved" | "rejected" | "changes_requested";
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
  reviewerName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  changesRequestedReason?: string;
  submissionCount: number;
  history?: Array<{
    action: string;
    actorRole?: string;
    notes?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export function AdminApprovalsClient() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Action Modals State
  const [actionModal, setActionModal] = useState<{
    app: Application;
    action: "approve" | "reject" | "request_changes";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/organizers/applications?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleExecuteAction() {
    if (!actionModal) return;
    setActionError(null);
    setActionSubmitting(true);

    try {
      const res = await fetch(
        `/api/admin/organizers/applications/${actionModal.app._id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionModal.action,
            reason: actionReason.trim() || undefined,
            reviewNotes: actionNotes.trim() || undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionError(data.message || "Failed to execute review decision.");
        return;
      }

      setActionSuccess(data.message);
      setActionModal(null);
      setActionReason("");
      setActionNotes("");
      fetchApplications();
    } catch (err) {
      console.error("Review action error:", err);
      setActionError("Network error. Please try again.");
    } finally {
      setActionSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Approvals Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Review organizer accreditation requests for individual students and campus organizations.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-900 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <Card className="p-4 border-slate-200/80 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: "pending", label: "Pending" },
              { id: "changes_requested", label: "Changes Requested" },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
              { id: "all", label: "All" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#101C3A] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Type Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="individual">Individual Students</option>
              <option value="organization">Campus Organizations</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by applicant name, organization, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
      </Card>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 space-y-3">
              <div className="h-5 w-48 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-4 w-96 bg-slate-100 rounded-md animate-pulse" />
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center space-y-2 border-slate-200/80 bg-white">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-notari-dark">No applications found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {statusFilter === "pending"
              ? "All caught up! There are currently no pending organizer applications awaiting review."
              : "No organizer applications match the selected filter criteria."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const isExpanded = expandedId === app._id;
            const targetName =
              app.applicantType === "individual"
                ? app.displayName || app.applicantName
                : app.organizationName;

            return (
              <Card
                key={app._id}
                className="p-5 sm:p-6 border-slate-200/80 bg-white shadow-xs space-y-4 transition-all"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {app.status === "pending" && (
                        <Badge variant="warning" className="text-xs">
                          Pending Review
                        </Badge>
                      )}
                      {app.status === "approved" && (
                        <Badge className="bg-emerald-600 text-white text-xs">Approved</Badge>
                      )}
                      {app.status === "rejected" && (
                        <Badge variant="error" className="text-xs">
                          Rejected
                        </Badge>
                      )}
                      {app.status === "changes_requested" && (
                        <Badge className="bg-amber-600 text-white text-xs">Changes Requested</Badge>
                      )}

                      <span className="text-xs font-semibold text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600 capitalize">
                        {app.applicantType === "individual"
                          ? "Individual Student Organizer"
                          : `Campus Organization (${app.organizationCategory || "Group"})`}
                      </span>

                      {app.submissionCount > 1 && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          v{app.submissionCount}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-[#101C3A]">{targetName}</h3>

                    <p className="text-xs text-slate-500">
                      Applicant:{" "}
                      <strong className="text-slate-700">
                        {app.applicantType === "individual"
                          ? app.applicantName
                          : app.contactPersonName}
                      </strong>{" "}
                      •{" "}
                      {app.applicantType === "individual"
                        ? app.applicantEmail
                        : app.contactPersonEmail}
                    </p>
                  </div>

                  {/* Top Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : app._id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "Collapse" : "Review Details"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {app.status !== "approved" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setActionModal({ app, action: "approve" });
                          setActionReason("");
                          setActionNotes("");
                          setActionError(null);
                        }}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 gap-1 h-8 rounded-lg"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Collapsible Expanded Details */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-100 space-y-4 text-xs animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl">
                      <div>
                        <span className="text-slate-400 block font-medium">Faculty & Department</span>
                        <span className="font-semibold text-slate-800">
                          {[app.department, app.faculty].filter(Boolean).join(" • ") || "University-wide"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Matriculation Number</span>
                        <span className="font-semibold text-slate-800">
                          {app.applicantMatricNumber || app.contactPersonMatric || "Not Provided"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-medium">Phone Number</span>
                        <span className="font-semibold text-slate-800">
                          {app.phone || app.contactPersonPhone}
                        </span>
                      </div>
                      {app.officialEmail && (
                        <div>
                          <span className="text-slate-400 block font-medium">Official Org Email</span>
                          <span className="font-semibold text-slate-800">{app.officialEmail}</span>
                        </div>
                      )}
                      {app.supportingLinks && (
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 block font-medium">Supporting Links / Portfolio</span>
                          <a
                            href={app.supportingLinks.startsWith("http") ? app.supportingLinks : `https://${app.supportingLinks}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold truncate"
                          >
                            <span>{app.supportingLinks}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold text-slate-700 block">About / Mission Statement:</span>
                      <p className="p-3 bg-white border border-slate-200/80 rounded-xl text-slate-600 leading-relaxed">
                        {app.description || app.organizationDescription}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="font-bold text-slate-700 block">Reason for Requesting Organizer Access:</span>
                      <p className="p-3 bg-white border border-slate-200/80 rounded-xl text-slate-600 leading-relaxed">
                        {app.reason}
                      </p>
                    </div>

                    {app.experience && (
                      <div className="space-y-2">
                        <span className="font-bold text-slate-700 block">Past Organizing Experience:</span>
                        <p className="p-3 bg-white border border-slate-200/80 rounded-xl text-slate-600 leading-relaxed">
                          {app.experience}
                        </p>
                      </div>
                    )}

                    {/* Review Feedback History if available */}
                    {(app.rejectionReason || app.changesRequestedReason) && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                        <span className="font-bold text-amber-900 block">Previous Admin Review Notes:</span>
                        <p className="text-amber-800 leading-relaxed">
                          {app.rejectionReason || app.changesRequestedReason}
                        </p>
                      </div>
                    )}

                    {/* Bottom Action Buttons for Superadmin */}
                    {app.status !== "approved" && (
                      <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionModal({ app, action: "request_changes" });
                            setActionReason("");
                            setActionNotes("");
                            setActionError(null);
                          }}
                          className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          Request Changes
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionModal({ app, action: "reject" });
                            setActionReason("");
                            setActionNotes("");
                            setActionError(null);
                          }}
                          className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Reject Application
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            setActionModal({ app, action: "approve" });
                            setActionReason("");
                            setActionNotes("");
                            setActionError(null);
                          }}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Approve Accreditation
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Decision Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-6 bg-white space-y-4 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#101C3A]">
                {actionModal.action === "approve" && "Confirm Organizer Approval"}
                {actionModal.action === "reject" && "Reject Organizer Application"}
                {actionModal.action === "request_changes" && "Request Revisions from Applicant"}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {actionError}
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Target Applicant:{" "}
                <strong className="text-slate-800">
                  {actionModal.app.applicantType === "individual"
                    ? actionModal.app.displayName || actionModal.app.applicantName
                    : actionModal.app.organizationName}
                </strong>
              </p>

              {actionModal.action === "approve" && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                  <p className="font-semibold">
                    ✓ This action will activate an approved OrganizerProfile in MongoDB.
                  </p>
                  <p>
                    ✓ For individual students, their student capabilities, history, and tickets will be
                    strictly preserved while granting access to the Organizer Dashboard.
                  </p>
                </div>
              )}

              {(actionModal.action === "reject" || actionModal.action === "request_changes") && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    {actionModal.action === "reject" ? "Reason for Rejection *" : "Explanation of Required Changes *"}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={
                      actionModal.action === "reject"
                        ? "Explain why the application does not meet current criteria (minimum 5 characters)..."
                        : "Describe specifically what the applicant should fix or provide..."
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">
                    This explanation will be visible to the applicant on their status page.
                  </span>
                </div>
              )}

              {actionModal.action === "approve" && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">
                    Approval Notes (Optional internal note)
                  </label>
                  <input
                    type="text"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="e.g. Verified by Student Affairs / Dean"
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600/20 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal(null)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionSubmitting}
                onClick={handleExecuteAction}
                className={`text-xs rounded-xl text-white ${
                  actionModal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : actionModal.action === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {actionSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>
                    {actionModal.action === "approve" && "Confirm Approval"}
                    {actionModal.action === "reject" && "Confirm Rejection"}
                    {actionModal.action === "request_changes" && "Send Change Request"}
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
