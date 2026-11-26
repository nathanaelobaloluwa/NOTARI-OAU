"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/lib/toast";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const devOtpParam = searchParams.get("devOtp") || "";

  const [email] = useState(emailParam);
  const [devOtp, setDevOtp] = useState(devOtpParam);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const maskEmail = (val: string) => {
    if (!val || !val.includes("@")) return "your email";
    const [user, domain] = val.split("@");
    if (user.length <= 2) return `${user[0]}*@${domain}`;
    return `${user[0]}${"*".repeat(Math.min(user.length - 2, 4))}${user[user.length - 1]}@${domain}`;
  };

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (char && index === 5 && newDigits.every((d) => d !== "")) {
      submitCode(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    setErrorMessage(null);

    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const submitCode = async (codeToSubmit: string) => {
    if (!email) {
      setErrorMessage("Missing email address. Please return to registration.");
      toast.error("Missing email address for verification.");
      return;
    }

    if (codeToSubmit.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/verify-registration-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeToSubmit }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.message || "Invalid verification code. Please try again.";
        setErrorMessage(msg);
        toast.error("Verification failed", { description: msg });
        setIsVerifying(false);
        return;
      }

      setSuccessMessage("Email verified successfully! Redirecting to login...");
      toast.success("Email verified successfully!", {
        description: "Your university account is active. Please log in.",
      });

      setTimeout(() => {
        router.push("/login?verified=true");
      }, 1500);
    } catch {
      const msg = "Network error occurred while verifying code. Please check your connection.";
      setErrorMessage(msg);
      toast.error("Network Error", { description: msg });
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || !email) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "registration" }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.message || "Failed to resend verification code.";
        setErrorMessage(msg);
        toast.error("Resend Failed", { description: msg });
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
      } else {
        toast.success("New code sent!", {
          description: `A fresh 6-digit code was sent to ${maskEmail(email)}.`,
        });
        setCooldown(data.cooldownRemaining || 60);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast.error("Network Error", {
        description: "Failed to connect to verification server.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 border-slate-200/80 shadow-xl bg-white rounded-2xl max-w-md mx-auto">
      <div className="space-y-2 text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-notari-primary mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-notari-dark">
          Verify Your Email
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter the 6-digit code sent to{" "}
          <strong className="text-notari-dark font-semibold">
            {maskEmail(email)}
          </strong>
        </p>
      </div>

      {/* Dev OTP Helper */}
      {devOtp && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
              🛠️ Development Test Helper
            </span>
            <button
              type="button"
              onClick={() => {
                const chars = devOtp.slice(0, 6).split("");
                setDigits(chars);
                submitCode(devOtp.slice(0, 6));
              }}
              className="text-[10px] font-bold text-notari-primary hover:underline cursor-pointer"
            >
              Auto-fill & Verify
            </button>
          </div>
          <p className="text-[11px] text-amber-700">
            Resend test code: <strong className="font-mono text-sm tracking-wider">{devOtp}</strong>
          </p>
        </div>
      )}

      {/* Alert Messages */}
      {successMessage && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 6-Digit OTP Input Grid */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitCode(digits.join(""));
        }}
        className="space-y-6"
      >
        <div className="flex justify-center gap-2 sm:gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={isVerifying}
              aria-label={`Digit ${idx + 1}`}
              className="w-11 h-14 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl border border-slate-300 focus:border-notari-primary focus:ring-2 focus:ring-notari-primary/20 bg-slate-50 focus:bg-white outline-none transition-all disabled:opacity-50"
            />
          ))}
        </div>

        <Button
          type="submit"
          disabled={isVerifying || digits.some((d) => d === "")}
          className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <span>Verify & Activate Account</span>
          )}
        </Button>
      </form>

      {/* Resend Cooldown & Action */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span>Didn&apos;t receive the email?</span>
          {cooldown > 0 ? (
            <span className="font-semibold text-slate-700">
              Resend in {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              disabled={isResending}
              onClick={handleResend}
              className="font-bold text-notari-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Resend Code</span>
              )}
            </button>
          )}
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-notari-dark transition-colors font-medium mt-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>
      </div>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-notari-bg flex flex-col justify-center items-center p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-notari-primary" />
          </div>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
