import React, { Suspense } from "react";
import { Metadata } from "next";
import { PaymentVerifyClient } from "@/components/payment/PaymentVerifyClient";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify Payment | NOTARI 2.0",
  description: "Secure payment verification and digital ticket fulfillment via Paystack.",
};

export default function PaymentVerifyPage() {
  return (
    <div className="min-h-screen bg-notari-bg py-8 sm:py-12">
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-notari-primary mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading payment verification...</p>
            </div>
          </div>
        }
      >
        <PaymentVerifyClient />
      </Suspense>
    </div>
  );
}

