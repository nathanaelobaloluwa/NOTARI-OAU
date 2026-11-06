"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Send,
  Check,
} from "lucide-react";

interface PayoutAccountItem {
  id: string;
  organizerName: string;
  organizerEmail: string;
  brandName: string;
  bankName: string;
  bankCode: string;
  accountNumberMasked: string;
  accountName: string;
  status: "pending_verification" | "verified" | "rejected" | "disabled";
  rejectionReason?: string;
  verificationNotes?: string;
  verifiedAt?: string;
  createdAt: string;
}

interface PayoutRequestItem {
  id: string;
  payoutReference: string;
  organizerName: string;
  organizerEmail: string;
  brandName: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
  amount: number;
  currency: string;
  status: string;
  paystackTransferCode?: string;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
}

interface RefundItem {
  id: string;
  refundReference: string;
  studentName: string;
  studentEmail: string;
  studentMatric: string;
  eventTitle: string;
  bookingReference: string;
  ticketQuantity: number;
  organizerName: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  ticketsInvalidated: boolean;
  rejectionReason?: string;
  createdAt: string;
}

interface ReconciliationIssue {
  type: string;
  severity: "high" | "medium" | "low";
  reference: string;
  details: string;
  timestamp: string;
}

export function AdminFinancialClient() {
  const [activeTab, setActiveTab] = useState<"accounts" | "payouts" | "refunds" | "reconciliation">("accounts");
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [accounts, setAccounts] = useState<PayoutAccountItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [reconciliationIssues, setReconciliationIssues] = useState<ReconciliationIssue[]>([]);

  // Action modals / state
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load Tab Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      if (activeTab === "accounts") {
        const res = await fetch("/api/admin/financial/accounts");
        const data = await res.json();
        if (data.success) setAccounts(data.accounts || []);
      } else if (activeTab === "payouts") {
        const res = await fetch("/api/admin/financial/payouts");
        const data = await res.json();
        if (data.success) setPayouts(data.payouts || []);
      } else if (activeTab === "refunds") {
        const res = await fetch("/api/admin/financial/refunds");
        const data = await res.json();
        if (data.success) setRefunds(data.refunds || []);
      } else if (activeTab === "reconciliation") {
        const res = await fetch("/api/admin/financial/reconciliation");
        const data = await res.json();
        if (data.success) setReconciliationIssues(data.discrepancies || []);
      }
    } catch (err) {
      console.error("Failed to load admin financial data:", err);
      setActionError("Failed to fetch data from server");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Account Review Action
  const handleAccountAction = async (accountId: string, action: "approve" | "reject" | "disable") => {
    let reason: string | undefined = undefined;
    if (action === "reject") {
      const promptReason = window.prompt("Enter rejection reason for this payout account:");
      if (!promptReason) return;
      reason = promptReason;
    }

    setActionInProgress(accountId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/financial/accounts/${accountId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message);
        await loadData();
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(data.message || "Action failed");
      }
    } catch {
      setActionError("Network error executing account review");
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Payout Review Action
  const handlePayoutAction = async (
    payoutId: string,
    action: "approve" | "reject" | "process" | "mark_successful" | "mark_failed"
  ) => {
    let reason: string | undefined = undefined;
    if (action === "reject" || action === "mark_failed") {
      const promptReason = window.prompt("Enter reason for rejection/failure:");
      if (!promptReason) return;
      reason = promptReason;
    }

    setActionInProgress(payoutId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/financial/payouts/${payoutId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message);
        await loadData();
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(data.message || "Action failed");
      }
    } catch {
      setActionError("Network error executing payout review");
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Refund Review Action
  const handleRefundAction = async (refundId: string, action: "approve" | "reject") => {
    let reason: string | undefined = undefined;
    if (action === "reject") {
      const promptReason = window.prompt("Enter rejection reason:");
      if (!promptReason) return;
      reason = promptReason;
    }

    setActionInProgress(refundId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/financial/refunds/${refundId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(data.message);
        await loadData();
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(data.message || "Action failed");
      }
    } catch {
      setActionError("Network error executing refund review");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Financial & Settlement Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Superadmin oversight for organizer payout accounts, withdrawal disbursements, and student refunds.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="rounded-xl h-9 text-xs font-semibold gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "accounts"
              ? "border-notari-primary text-notari-primary"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Payout Accounts</span>
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "payouts"
              ? "border-notari-primary text-notari-primary"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Withdrawal Requests</span>
        </button>
        <button
          onClick={() => setActiveTab("refunds")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "refunds"
              ? "border-notari-primary text-notari-primary"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Student Refunds</span>
        </button>
        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "reconciliation"
              ? "border-notari-primary text-notari-primary"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Reconciliation Audit</span>
        </button>
      </div>

      {/* 3. Tab Contents */}
      {isLoading ? (
        <Card className="p-12 text-center border-slate-200/80 bg-white">
          <Loader2 className="w-6 h-6 animate-spin text-notari-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading financial records...</p>
        </Card>
      ) : activeTab === "accounts" ? (
        <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No organizer payout accounts submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Organizer</th>
                    <th className="py-3 px-4">Bank Details</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-notari-dark block">{acc.brandName}</span>
                        <span className="text-slate-400 text-[11px]">{acc.organizerEmail}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{acc.bankName}</span>
                        <span className="text-slate-500 block font-mono text-[11px]">{acc.accountNumberMasked}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{acc.accountName}</td>
                      <td className="py-3.5 px-4">
                        {acc.status === "verified" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {acc.status === "pending_verification" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending Review
                          </span>
                        )}
                        {acc.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                        {acc.status === "disabled" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {acc.status !== "verified" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionInProgress === acc.id}
                              onClick={() => handleAccountAction(acc.id, "approve")}
                              className="h-8 text-[11px] font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-lg"
                            >
                              Approve
                            </Button>
                          )}
                          {acc.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionInProgress === acc.id}
                              onClick={() => handleAccountAction(acc.id, "reject")}
                              className="h-8 text-[11px] font-semibold text-rose-700 border-rose-300 hover:bg-rose-50 rounded-lg"
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : activeTab === "payouts" ? (
        <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
          {payouts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No payout requests submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Organizer</th>
                    <th className="py-3 px-4">Destination Bank</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-notari-dark">
                        {p.payoutReference}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-notari-dark block">{p.brandName}</span>
                        <span className="text-slate-400 text-[11px]">{p.organizerEmail}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{p.bankName}</span>
                        <span className="text-slate-500 block text-[11px] font-mono">{p.accountNumberMasked}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-notari-dark text-sm">
                        ₦{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.status === "successful" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Successful
                          </span>
                        )}
                        {p.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {p.status === "approved" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <Check className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {p.status === "processing" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Processing
                          </span>
                        )}
                        {p.status === "failed" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                        {p.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionInProgress === p.id}
                              onClick={() => handlePayoutAction(p.id, "approve")}
                              className="h-8 text-[11px] font-semibold text-indigo-700 border-indigo-300 hover:bg-indigo-50 rounded-lg"
                            >
                              Approve
                            </Button>
                          )}
                          {(p.status === "approved" || p.status === "pending") && (
                            <Button
                              size="sm"
                              disabled={actionInProgress === p.id}
                              onClick={() => handlePayoutAction(p.id, "process")}
                              className="h-8 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Disburse
                            </Button>
                          )}
                          {p.status !== "successful" && p.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionInProgress === p.id}
                              onClick={() => handlePayoutAction(p.id, "reject")}
                              className="h-8 text-[11px] font-semibold text-rose-700 border-rose-300 hover:bg-rose-50 rounded-lg"
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : activeTab === "refunds" ? (
        <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
          {refunds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No student refund requests submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-notari-dark block">{r.studentName}</span>
                        <span className="text-slate-400 text-[11px]">{r.studentEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{r.eventTitle}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{r.bookingReference}</td>
                      <td className="py-3.5 px-4 font-bold text-notari-dark">
                        ₦{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">{r.reason}</td>
                      <td className="py-3.5 px-4">
                        {r.status === "successful" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Refunded
                          </span>
                        )}
                        {r.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending Review
                          </span>
                        )}
                        {r.status === "rejected" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {r.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={actionInProgress === r.id}
                              onClick={() => handleRefundAction(r.id, "approve")}
                              className="h-8 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                            >
                              Approve Refund
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionInProgress === r.id}
                              onClick={() => handleRefundAction(r.id, "reject")}
                              className="h-8 text-[11px] font-semibold text-rose-700 border-rose-300 hover:bg-rose-50 rounded-lg"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        /* Reconciliation Audit Tab */
        <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-notari-dark">Ledger Reconciliation Integrity Check</h3>
              <p className="text-xs text-slate-500">
                Automated detection of orphan records, unrecorded payments, and accounting anomalies.
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                reconciliationIssues.length === 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {reconciliationIssues.length === 0
                ? "All Records Reconciled (100% Balanced)"
                : `${reconciliationIssues.length} Discrepanc${reconciliationIssues.length === 1 ? "y" : "ies"} Detected`}
            </span>
          </div>

          {reconciliationIssues.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-notari-dark">All Platform Financial Records are Synchronized</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Every verified ticket payment matches an immutable ledger entry, refunds correlate exactly with original transactions, and all payout reservations are accounted for.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {reconciliationIssues.map((issue, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-700">{issue.reference}</span>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                        {issue.type}
                      </span>
                    </div>
                    <p className="text-slate-600">{issue.details}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(issue.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
