"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Clock,
  ArrowRight,
  Loader2,
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Wallet,
  X,
  CreditCard,
  History,
} from "lucide-react";

interface PayoutAccountData {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumberMasked: string;
  accountName: string;
  status: "pending_verification" | "verified" | "rejected" | "disabled";
  rejectionReason?: string;
  verificationNotes?: string;
}

interface FinancialSummaryData {
  grossSalesInNaira: number;
  platformFeeInNaira: number;
  platformFeeRate: number;
  refundsInNaira: number;
  netEarningsInNaira: number;
  lockedPayoutsInNaira: number;
  completedPayoutsInNaira: number;
  availableBalanceInNaira: number;
  successfulOrdersCount: number;
  pendingOrdersCount: number;
  totalTicketsSold: number;
}

interface PayoutItem {
  id: string;
  payoutReference: string;
  amount: number;
  currency: string;
  status: string;
  bankName: string;
  accountNumberMasked: string;
  createdAt: string;
  paidAt?: string;
  failureReason?: string;
}

interface LedgerItem {
  id: string;
  entryType: string;
  direction: "credit" | "debit";
  amount: number;
  reference: string;
  description: string;
  createdAt: string;
}

interface BankOption {
  id: number;
  name: string;
  code: string;
  slug: string;
}

export function OrganizerPayoutsClient() {
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [account, setAccount] = useState<PayoutAccountData | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [activeTab, setActiveTab] = useState<"payouts" | "ledger">("payouts");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Bank Account Modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);

  // Withdrawal Modal
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    try {
      const [sumRes, payoutsRes, banksRes] = await Promise.all([
        fetch("/api/organizer/financial-summary"),
        fetch("/api/organizer/payouts"),
        fetch("/api/organizer/banks"),
      ]);

      const sumData = await sumRes.json();
      if (sumData.success && sumData.summary) {
        setSummary(sumData.summary);
      }

      const payoutsData = await payoutsRes.json();
      if (payoutsData.success) {
        setPayouts(payoutsData.payouts || []);
        setLedger(payoutsData.ledger || []);
        if (payoutsData.payoutAccount) {
          setAccount(payoutsData.payoutAccount);
        }
      }

      const banksData = await banksRes.json();
      if (banksData.success && banksData.banks) {
        setBanks(banksData.banks);
      }
    } catch (err) {
      console.error("Failed to load organizer financial dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle bank account submission
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    setBankSuccess(null);
    setBankSubmitting(true);

    try {
      const selectedBank = banks.find((b) => b.code === bankCode);
      const res = await fetch("/api/organizer/payout-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode,
          bankName: selectedBank ? selectedBank.name : bankName,
          accountNumber,
          accountName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBankSuccess("Bank details submitted for verification!");
        setAccount(data.account);
        setTimeout(() => {
          setIsBankModalOpen(false);
          setBankSuccess(null);
        }, 1500);
      } else {
        setBankError(data.message || "Failed to submit bank account");
      }
    } catch {
      setBankError("Network error while submitting bank account details");
    } finally {
      setBankSubmitting(false);
    }
  };

  // Handle withdrawal request
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 100) {
      setWithdrawError("Minimum withdrawal amount is ₦100.00");
      return;
    }

    if (summary && amountNum > summary.availableBalanceInNaira) {
      setWithdrawError(
        `Amount exceeds available balance of ₦${summary.availableBalanceInNaira.toLocaleString()}`
      );
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const res = await fetch("/api/organizer/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawSuccess(data.message || "Payout request submitted successfully!");
        setWithdrawAmount("");
        await loadData();
        setTimeout(() => {
          setIsWithdrawModalOpen(false);
          setWithdrawSuccess(null);
        }, 1800);
      } else {
        setWithdrawError(data.message || "Failed to submit withdrawal request");
      }
    } catch {
      setWithdrawError("Network error while submitting payout request");
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            Revenue & Payout Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track verified ticket earnings, manage disbursement bank accounts, and request withdrawals.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <Link href="/organizer/orders">
            <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs font-semibold gap-1.5 shadow-xs">
              <span>View Orders</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Bank Account Status Card */}
      <Card className="p-5 border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-notari-primary flex items-center justify-center shrink-0 mt-0.5">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-notari-dark">Settlement Bank Account</h3>
                {account?.status === "verified" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                )}
                {account?.status === "pending_verification" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Clock className="w-3 h-3" />
                    Pending Review
                  </span>
                )}
                {account?.status === "rejected" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    <AlertCircle className="w-3 h-3" />
                    Rejected
                  </span>
                )}
                {!account && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Not Configured
                  </span>
                )}
              </div>

              {account ? (
                <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                  <p className="font-semibold text-notari-dark">
                    {account.bankName} • {account.accountNumberMasked}
                  </p>
                  <p className="text-slate-500">{account.accountName}</p>
                  {account.rejectionReason && (
                    <p className="text-rose-600 font-medium mt-1">
                      Reason: {account.rejectionReason}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Add a verified Nigerian bank account to withdraw your ticket sales earnings.
                </p>
              )}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (account) {
                setBankCode(account.bankCode || "");
                setBankName(account.bankName || "");
                setAccountName(account.accountName || "");
              }
              setIsBankModalOpen(true);
            }}
            className="rounded-xl text-xs font-semibold bg-notari-primary hover:bg-notari-primary/95 text-white shadow-xs shrink-0"
          >
            {account ? (
              <>
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                <span>Update Account</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Add Bank Account</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 3. Metrics Cards */}
      {isLoading ? (
        <Card className="p-8 border-slate-200/80 bg-white text-center">
          <Loader2 className="w-6 h-6 animate-spin text-notari-primary mx-auto mb-2" />
          <p className="text-xs text-slate-500">Calculating ledger balance...</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Available Balance */}
          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Available to Withdraw</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-emerald-600">
              ₦{(summary?.availableBalanceInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="pt-1">
              <Button
                size="sm"
                disabled={
                  !account ||
                  account.status !== "verified" ||
                  (summary?.availableBalanceInNaira ?? 0) < 100
                }
                onClick={() => setIsWithdrawModalOpen(true)}
                className="w-full rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
              >
                <span>Request Withdrawal</span>
              </Button>
            </div>
          </Card>

          {/* Net Proceeds */}
          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Net Earnings</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-notari-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-notari-dark">
              ₦{(summary?.netEarningsInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500">
              After platform fees (0%) & refunds
            </p>
          </Card>

          {/* Locked / In-Review Payouts */}
          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">In Review / Processing</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-700">
              ₦{(summary?.lockedPayoutsInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400">Reserved awaiting disbursement</p>
          </Card>

          {/* Gross Sales */}
          <Card className="p-5 border-slate-200/80 bg-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Gross Ticket Volume</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-notari-dark">
              ₦{(summary?.grossSalesInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400">
              {summary?.totalTicketsSold ?? 0} tickets sold across all events
            </p>
          </Card>
        </div>
      )}

      {/* 4. Financial Breakdown Accordion/Card */}
      <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-notari-dark uppercase tracking-wider">
          Financial Ledger Accounting
        </h3>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-600">Gross Ticket Volume</span>
            <span className="font-semibold text-notari-dark">
              ₦{(summary?.grossSalesInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-600">Platform Commission (0%)</span>
            <span className="font-semibold text-slate-500">₦0.00</span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-600">Total Refunds Processed</span>
            <span className="font-semibold text-rose-600">
              -₦{(summary?.refundsInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-600">Disbursed Withdrawals</span>
            <span className="font-semibold text-slate-600">
              -₦{(summary?.completedPayoutsInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="py-3 flex justify-between items-center text-sm">
            <span className="font-bold text-notari-dark">Current Available Balance</span>
            <span className="font-black text-emerald-600">
              ₦{(summary?.availableBalanceInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </Card>

      {/* 5. Tabs: Payout Requests vs Financial Ledger */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("payouts")}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "payouts"
                ? "border-notari-primary text-notari-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Withdrawal Requests ({payouts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "ledger"
                ? "border-notari-primary text-notari-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Immutable Ledger ({ledger.length})</span>
          </button>
        </div>

        {activeTab === "payouts" ? (
          <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No withdrawal requests submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Bank Account</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-notari-dark">
                          {p.payoutReference}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(p.createdAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-700">{p.bankName}</span>
                          <span className="text-slate-400 block text-[11px]">{p.accountNumberMasked}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-notari-dark">
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
                              Pending Review
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <Card className="border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {ledger.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700 uppercase text-[10px]">
                          {l.entryType.replace(/_/g, " ")}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                          {l.description}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {l.reference}
                        </td>
                        <td className={`py-3.5 px-4 font-bold text-right ${l.direction === "credit" ? "text-emerald-600" : "text-slate-800"}`}>
                          {l.direction === "credit" ? "+" : "-"}₦{l.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* MODAL 1: Bank Account Form */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-notari-primary" />
                <h3 className="text-base font-bold text-notari-dark">Settlement Bank Details</h3>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="p-5 space-y-4">
              {bankError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {bankError}
                </div>
              )}
              {bankSuccess && (
                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                  {bankSuccess}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                <select
                  required
                  value={bankCode}
                  onChange={(e) => {
                    setBankCode(e.target.value);
                    const b = banks.find((item) => item.code === e.target.value);
                    if (b) setBankName(b.name);
                  }}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-notari-primary"
                >
                  <option value="">Select your Nigerian Bank...</option>
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">10-Digit Account Number (NUBAN)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  pattern="\d{10}"
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 text-slate-800 font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-notari-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="Name as registered with your bank"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-notari-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBankModalOpen(false)}
                  className="rounded-xl h-10 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={bankSubmitting || !bankCode || accountNumber.length !== 10 || !accountName}
                  className="rounded-xl h-10 text-xs font-semibold bg-notari-primary hover:bg-notari-primary/95 text-white"
                >
                  {bankSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Submit for Verification</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Withdrawal Request Form */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-notari-dark">Request Payout Withdrawal</h3>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-5 space-y-4">
              {withdrawError && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {withdrawError}
                </div>
              )}
              {withdrawSuccess && (
                <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                  {withdrawSuccess}
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Available Balance</span>
                <p className="text-xl font-black text-emerald-600">
                  ₦{(summary?.availableBalanceInNaira ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400">
                  Disbursing to: <span className="font-semibold text-slate-700">{account?.bankName} ({account?.accountNumberMasked})</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Withdrawal Amount (₦)</label>
                <input
                  type="number"
                  required
                  min={100}
                  max={summary?.availableBalanceInNaira ?? 0}
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-bold rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-notari-primary"
                />
                <p className="text-[11px] text-slate-400">Minimum withdrawal amount: ₦100.00</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="rounded-xl h-10 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={withdrawSubmitting || !withdrawAmount || parseFloat(withdrawAmount) < 100}
                  className="rounded-xl h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {withdrawSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Submit Request</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
