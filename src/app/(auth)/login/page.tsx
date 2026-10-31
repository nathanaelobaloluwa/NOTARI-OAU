"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, User, Sparkles, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthRoleTab = "student" | "organizer" | "admin";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const callbackUrl = searchParams.get("callbackUrl");

  const [activeTab, setActiveTab] = useState<AuthRoleTab>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setErrorMessage("Invalid email or password. Please verify your credentials and try again.");
        setIsLoading(false);
        return;
      }

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
      console.error("Login submission error:", err);
      setErrorMessage("An unexpected network error occurred. Please check your connection.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-5 sm:p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl">
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
          onClick={() => {
            setActiveTab("student");
            setErrorMessage(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all",
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
          onClick={() => {
            setActiveTab("organizer");
            setErrorMessage(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all",
            activeTab === "organizer"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-slate-600 hover:text-notari-dark"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Organizer</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("admin");
            setErrorMessage(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all",
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
            className="rounded border-slate-300 text-notari-primary focus:ring-notari-primary"
          />
          <label htmlFor="remember" className="text-xs text-slate-600 cursor-pointer">
            Remember me
          </label>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl font-semibold shadow-md mt-2"
        >
          {isLoading ? "Verifying Credentials..." : "Sign In"}
        </Button>
      </form>

      {/* Development Account Quick-Fill Helpers (fills email and role context) */}
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
          onClick={() => {
            setEmail("student@notari.oau.edu.ng");
            setActiveTab("student");
            setErrorMessage(null);
          }}
          className="py-2.5 px-1 text-[10px] sm:text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors truncate"
        >
          Dev Student
        </button>
        <button
          type="button"
          onClick={() => {
            setEmail("organizer@notari.oau.edu.ng");
            setActiveTab("organizer");
            setErrorMessage(null);
          }}
          className="py-2.5 px-1 text-[10px] sm:text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors truncate"
        >
          Dev Org
        </button>
        <button
          type="button"
          onClick={() => {
            setEmail("admin@notari.oau.edu.ng");
            setActiveTab("admin");
            setErrorMessage(null);
          }}
          className="py-2.5 px-1 text-[10px] sm:text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors truncate"
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
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Card className="p-8 border-slate-200 shadow-lg rounded-2xl bg-white animate-pulse h-96" />}>
      <LoginForm />
    </Suspense>
  );
}
