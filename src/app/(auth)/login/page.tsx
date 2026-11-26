"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotariLoader } from "@/components/shared/notari-loader";
import { toast } from "@/lib/toast";

type AuthRoleTab = "student" | "organizer" | "admin";
type AuthStep = "credentials" | "otp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const callbackUrl = searchParams.get("callbackUrl");

  const [step, setStep] = useState<AuthStep>("credentials");
  const [activeTab, setActiveTab] = useState<AuthRoleTab>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification state
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    if (step !== "otp" || cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, cooldown]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 50);
    }
  }, [step]);

  // Step 1: Submit Credentials & request login OTP challenge
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const res = await fetch("/api/auth/login-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requireVerification) {
          toast.warning("Verification Required", {
            description: "Please verify your email address before signing in.",
          });
          router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
          return;
        }

        const msg = data.message || "Invalid email or password. Please verify your credentials.";
        setErrorMessage(msg);
        toast.error("Sign-in failed", { description: msg });
        setIsLoading(false);
        return;
      }

      // Transition to Step 2: OTP Verification
      setChallengeToken(data.challengeToken);
      setMaskedEmail(data.email || normalizedEmail);
      setCooldown(data.cooldownRemaining || 60);
      setDigits(["", "", "", "", "", ""]);
      setStep("otp");
      setIsLoading(false);
      toast.info("Security code sent", {
        description: `We've sent a 6-digit code to ${data.email || normalizedEmail}.`,
      });
    } catch (err) {
      console.error("Login challenge network error:", err);
      const networkMsg = "Network error during sign-in. Please verify your connection.";
      setErrorMessage(networkMsg);
      toast.error("Network error", { description: networkMsg });
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP digit inputs
  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMessage(null);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (char && index === 5 && newDigits.every((d) => d !== "")) {
      handleVerifyOtp(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
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
      otpInputRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    } else {
      otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // Step 2: Verify OTP via NextAuth credentials provider
  const handleVerifyOtp = async (codeToSubmit: string) => {
    if (codeToSubmit.length !== 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        challengeToken,
        otpCode: codeToSubmit,
        redirect: false,
      });

      if (!res || res.error) {
        setErrorMessage("Invalid or expired verification code. Please check and try again.");
        toast.error("Verification failed", {
          description: "Incorrect or expired code. Please request a new code if needed.",
        });
        setIsLoading(false);
        return;
      }

      toast.success("Welcome back!", {
        description: "Your university authentication has been verified.",
      });

      // Query genuine authenticated session from server to retrieve verified database role
      const session = await getSession();
      const role = (session?.user as { role?: string })?.role;

      if (callbackUrl && !callbackUrl.startsWith("/login")) {
        router.push(callbackUrl);
      } else if (role === "admin") {
        router.push("/admin");
      } else if (role === "organizer") {
        router.push("/organizer");
      } else {
        router.push("/student");
      }
      router.refresh();
    } catch (err) {
      console.error("OTP verification error:", err);
      setErrorMessage("An unexpected network error occurred. Please try again.");
      toast.error("Network error during verification");
      setIsLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), purpose: "login" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "Failed to resend code.");
        toast.error("Resend failed", { description: data.message });
      } else {
        setCooldown(60);
        setDigits(["", "", "", "", "", ""]);
        toast.success("New code dispatched", {
          description: "A fresh 6-digit verification code has been sent to your inbox.",
        });
        setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
      }
    } catch (err) {
      console.error("Resend error:", err);
      toast.error("Network error", { description: "Could not resend code. Please try again." });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="p-5 sm:p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl">
      {step === "credentials" ? (
        <>
          <div className="space-y-1.5 text-center sm:text-left mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-notari-dark">
              Login to Your Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Enter your university credentials to access your NOTARI portal
            </p>
          </div>

          {/* Success Notification for New Registrations */}
          {registered && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Account created successfully! Please enter your email and password to log in.</span>
            </div>
          )}

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Role Context Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setActiveTab("student");
                setErrorMessage(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all disabled:opacity-50",
                activeTab === "student"
                  ? "bg-white text-notari-primary shadow-sm"
                  : "text-slate-600 hover:text-notari-dark"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setActiveTab("organizer");
                setErrorMessage(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all disabled:opacity-50",
                activeTab === "organizer"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-slate-600 hover:text-notari-dark"
              )}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Organizer</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setActiveTab("admin");
                setErrorMessage(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all disabled:opacity-50",
                activeTab === "admin"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-slate-600 hover:text-notari-dark"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Real Credentials Login Form */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Email Address</label>
              <Input
                type="email"
                placeholder={
                  activeTab === "admin"
                    ? "admin@notari.oau.edu.ng"
                    : activeTab === "organizer"
                    ? "organizer@notari.oau.edu.ng"
                    : "student@notari.oau.edu.ng"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-notari-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="rounded border-slate-300 text-notari-primary focus:ring-notari-primary disabled:opacity-50"
              />
              <label htmlFor="remember" className="text-xs text-slate-600 cursor-pointer">
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-semibold shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <NotariLoader size="sm" variant="white" text="Validating credentials..." />
              ) : (
                "Continue to Verification"
              )}
            </Button>
          </form>

          {/* Development Account Quick-Fill Helpers */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[10px] text-slate-400 font-medium">
                Development Quick Fill (Emails)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setEmail("student@notari.oau.edu.ng");
                setActiveTab("student");
                setErrorMessage(null);
              }}
              className="py-2.5 px-1 text-[10px] sm:text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors truncate disabled:opacity-50"
            >
              Dev Student
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setEmail("organizer@notari.oau.edu.ng");
                setActiveTab("organizer");
                setErrorMessage(null);
              }}
              className="py-2.5 px-1 text-[10px] sm:text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors truncate disabled:opacity-50"
            >
              Dev Org
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setEmail("admin@notari.oau.edu.ng");
                setActiveTab("admin");
                setErrorMessage(null);
              }}
              className="py-2.5 px-1 text-[10px] sm:text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors truncate disabled:opacity-50"
            >
              Dev Admin
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-notari-primary hover:underline">
              Create an account
            </Link>
          </p>
        </>
      ) : (
        /* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION */
        <div className="space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setErrorMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-notari-dark transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to credentials</span>
            </button>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-notari-primary mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-notari-dark">
              Enter Verification Code
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              For security, enter the 6-digit code sent to{" "}
              <span className="font-semibold text-slate-700">{maskedEmail}</span>
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 6-Digit Code Input Boxes */}
          <div className="space-y-4">
            <div className="flex justify-center sm:justify-between items-center gap-2 sm:gap-2.5">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isLoading}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  aria-label={`Digit ${index + 1} of verification code`}
                  className={cn(
                    "w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border border-slate-200 bg-slate-50/50 text-notari-dark transition-all",
                    "focus:outline-none focus:border-notari-primary focus:ring-4 focus:ring-notari-primary/10 focus:bg-white",
                    digit && "border-notari-primary/40 bg-white shadow-sm",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                />
              ))}
            </div>

            <Button
              type="button"
              disabled={isLoading || digits.some((d) => d === "")}
              onClick={() => handleVerifyOtp(digits.join(""))}
              className="w-full h-11 rounded-xl font-semibold shadow-md mt-4 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <NotariLoader size="sm" variant="white" text="Verifying code..." />
              ) : (
                "Verify & Sign In"
              )}
            </Button>
          </div>

          {/* Resend Cooldown Section */}
          <div className="pt-2 text-center text-xs text-slate-500 space-y-2 border-t border-slate-100">
            <p>Didn&apos;t receive the code or need a new one?</p>
            <button
              type="button"
              disabled={cooldown > 0 || isResending || isLoading}
              onClick={handleResendOtp}
              className={cn(
                "inline-flex items-center gap-1.5 font-bold transition-colors cursor-pointer",
                cooldown > 0 || isResending
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-notari-primary hover:underline"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isResending && "animate-spin")} />
              <span>
                {isResending
                  ? "Sending new code..."
                  : cooldown > 0
                  ? `Resend Code in ${cooldown}s`
                  : "Resend 6-Digit Code"}
              </span>
            </button>
            <p className="text-[11px] text-slate-400">
              Codes expire after 10 minutes. Check your university spam or junk folder if delayed.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-8 border-slate-200 shadow-lg rounded-2xl bg-white h-96 flex items-center justify-center">
          <NotariLoader size="lg" text="Loading NOTARI..." />
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
