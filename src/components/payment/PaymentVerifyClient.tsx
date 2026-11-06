"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ticket,
  Clock,
  ArrowRight,
  RefreshCw,
  Home,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

type VerificationStatus =
  | "verifying"
  | "success"
  | "pending"
  | "reconciliation_needed"
  | "failed";

interface VerificationData {
  bookingReference: string;
  ticketCodes: string[];
  amount: number;
  paymentStatus: string;
  tierName: string;
  quantity: number;
  eventTitle?: string;
  eventId?: string;
}

export function PaymentVerifyClient() {
  const searchParams = useSearchParams();
  const rawReference = searchParams.get("reference") || searchParams.get("trxref") || "";

  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const [data, setData] = useState<VerificationData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    if (!rawReference) {
      setStatus("failed");
      setErrorMessage("No transaction reference was provided in the payment callback.");
      return;
    }

    let isMounted = true;

    async function verify() {
      setStatus("verifying");
      setErrorMessage(null);

      try {
        const response = await fetch(
          `/api/payments/verify?reference=${encodeURIComponent(rawReference)}`
        );
        const result = await response.json();

        if (!isMounted) return;

        if (response.ok && result.success) {
          setData(result.data);
          const paymentStatus = result.data?.paymentStatus;
          if (paymentStatus === "reconciliation_needed") {
            setStatus("reconciliation_needed");
          } else if (paymentStatus === "pending" || paymentStatus === "processing") {
            setStatus("pending");
          } else {
            setStatus("success");
          }
        } else {
          const msg = result.message || "Failed to verify transaction with payment gateway.";
          setErrorMessage(msg);
          if (msg.toLowerCase().includes("reconciliation")) {
            setStatus("reconciliation_needed");
          } else if (msg.toLowerCase().includes("pending") || msg.toLowerCase().includes("processing")) {
            setStatus("pending");
          } else {
            setStatus("failed");
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Verification network error:", err);
        setStatus("failed");
        setErrorMessage(
          "A network error occurred while connecting to the verification server. Please check your internet connection."
        );
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [rawReference, retryCount]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* 1. VERIFYING STATE */}
        {status === "verifying" && (
          <Card className="p-8 border-slate-200/80 bg-white text-center space-y-5 rounded-2xl shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-notari-primary mx-auto animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-notari-dark tracking-tight">
                Verifying Your Payment
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Confirming transaction status with Paystack and issuing your secure digital passes.
                Please do not close or refresh this page.
              </p>
            </div>

            {rawReference && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 inline-block">
                <span className="text-[11px] font-mono text-slate-500">
                  Ref: <strong className="text-notari-dark">{rawReference}</strong>
                </span>
              </div>
            )}
          </Card>
        )}

        {/* 2. SUCCESS STATE */}
        {status === "success" && (
          <Card className="p-8 border-slate-200/80 bg-white text-center space-y-6 rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Payment Confirmed
              </span>
              <h2 className="text-2xl font-extrabold text-notari-dark tracking-tight">
                You&apos;re Going to the Event!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Your payment was verified successfully. Digital passes with authentic HMAC QR codes
                have been generated for your entry.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Booking Reference</span>
                <span className="font-mono font-bold text-notari-dark">
                  {data?.bookingReference || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Payment Reference</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {rawReference}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ticket Tier</span>
                <span className="font-semibold text-notari-dark">{data?.tierName || "General"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Passes Issued</span>
                <span className="font-bold text-emerald-600">{data?.quantity || 1} Ticket(s)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-notari-dark">Total Paid</span>
                <span className="text-sm font-extrabold text-notari-dark">
                  ₦{(data?.amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <Link href="/student/tickets" className="w-full block">
                <Button className="w-full h-12 rounded-xl text-xs sm:text-sm font-semibold shadow-md gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Ticket className="w-4 h-4" />
                  <span>View My Digital Tickets & QR</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              <Link href="/student/my-events" className="w-full block">
                <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
                  <span>Go to My Registered Events</span>
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* 3. PENDING STATE */}
        {status === "pending" && (
          <Card className="p-8 border-slate-200/80 bg-white text-center space-y-6 rounded-2xl shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <Clock className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Payment Awaiting Confirmation
              </span>
              <h2 className="text-xl font-extrabold text-notari-dark">
                Transaction Still Processing
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Paystack has recorded your transaction, but final settlement confirmation has not yet
                cleared. This usually takes 1 to 2 minutes.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                onClick={() => setRetryCount((c) => c + 1)}
                className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Check Status Again</span>
              </Button>
              <Link href="/student/history" className="w-full block">
                <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
                  <span>View My History</span>
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* 4. RECONCILIATION NEEDED (CAPACITY CONFLICT / LATE PAYMENT) */}
        {status === "reconciliation_needed" && (
          <Card className="p-8 border-amber-200 bg-white text-center space-y-6 rounded-2xl shadow-md">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Action Required
              </span>
              <h2 className="text-xl font-extrabold text-notari-dark">
                Capacity Limit Reached
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                Your payment of ₦{(data?.amount || 0).toLocaleString()} was received, but the event
                venue reached maximum capacity before checkout was completed.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 text-left space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Automated Protection Active</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                To guarantee student safety, the hall capacity cannot be exceeded. Your payment
                reference has been flagged for prioritized superadmin review and refund.
              </p>
              <p className="text-[11px] font-mono text-amber-800 pt-1">
                Reference: {rawReference}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link href="/events" className="w-full block">
                <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold">
                  <Home className="w-4 h-4 mr-2" />
                  <span>Browse Other Events</span>
                </Button>
              </Link>
              <Link href="/student/history" className="w-full block">
                <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
                  <span>Check Transaction History</span>
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* 5. FAILED STATE */}
        {status === "failed" && (
          <Card className="p-8 border-rose-200 bg-white text-center space-y-6 rounded-2xl shadow-md animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Payment Failed or Cancelled
              </span>
              <h2 className="text-xl font-extrabold text-notari-dark">
                Transaction Incomplete
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                {errorMessage ||
                  "The payment could not be confirmed. Your card was not debited or reserved tickets have been released."}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link href="/events" className="w-full block">
                <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  <span>Return to Events</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setRetryCount((c) => c + 1)}
                className="w-full h-11 rounded-xl text-xs font-semibold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>Retry Verification</span>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

