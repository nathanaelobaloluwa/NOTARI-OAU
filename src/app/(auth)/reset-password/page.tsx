"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token || !email) {
      setErrorMessage("Reset link is missing a valid token or email address. Please request a new link.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to reset password. The link may have expired.");
      } else {
        setIsSuccess(true);
      }
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <Card className="p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-notari-dark">Invalid Reset Link</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          This password reset link is missing required parameters or is malformed.
        </p>
        <Link href="/forgot-password" className="inline-block mt-2">
          <Button className="rounded-xl px-5 text-xs">Request New Link</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl">
      <div className="space-y-2 text-center sm:text-left mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-notari-primary flex items-center justify-center mb-2">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-notari-dark">
          Choose New Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Resetting password for <strong className="text-slate-700">{email}</strong>
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-6 text-center py-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-notari-dark text-base">Password Reset Successfully</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You can now log in to your NOTARI account with your new credentials.
            </p>
          </div>
          <Link href="/login" className="block">
            <Button className="w-full rounded-xl bg-notari-dark hover:bg-slate-800 text-white font-semibold">
              Sign In to NOTARI
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">New Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
              minLength={8}
            />
            <p className="text-[11px] text-slate-400">At least 8 characters</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Confirm New Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-semibold shadow-md mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating password...</span>
              </span>
            ) : (
              "Save New Password"
            )}
          </Button>

          <div className="text-center pt-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-notari-primary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel and return to login</span>
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-notari-primary" />
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
