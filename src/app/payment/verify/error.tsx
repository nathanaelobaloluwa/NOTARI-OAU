"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, AlertTriangle, ShieldCheck, Ticket } from "lucide-react";

interface PaymentVerifyErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PaymentVerifyError({ error, reset }: PaymentVerifyErrorProps) {
  useEffect(() => {
    console.error("🚨 [PAYMENT_VERIFY_ERROR]:", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-amber-200/80 p-8 shadow-sm flex flex-col items-center">
        <div className="p-4 bg-amber-50 rounded-2xl mb-4 text-[#F59E0B]" aria-hidden="true">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B] mb-1">
          Payment Verification Check
        </span>
        <h1 className="text-2xl font-bold text-[#151C35] mb-2">
          Verification In Progress or Interrupted
        </h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          We could not instantly finalize your payment verification response. If your account was debited, <strong>do not pay again</strong>. Paystack webhook verification will fulfill your ticket automatically.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full mb-6 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#20BFA9] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Financial Safety Guarantee:</p>
              <p>Your payment reference is tracked in NOTARI&apos;s ledger. If the transaction succeeded on Paystack, your ticket pass will appear in your tickets roster shortly.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4169E1] text-white font-semibold text-sm hover:bg-[#3358C8] transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Re-check Verification</span>
          </button>
          <Link
            href="/student/tickets"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            <Ticket className="w-4 h-4 shrink-0 text-[#20BFA9]" />
            <span>Check My Tickets</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
