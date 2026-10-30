"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <Card className="p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl">
      <div className="space-y-2 text-center sm:text-left mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-notari-dark">
          Reset Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your university email to receive a password reset link
        </p>
      </div>

      {submitted ? (
        <div className="space-y-6 text-center py-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-notari-dark text-base">Check your inbox</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              If an account matches <strong>{email}</strong>, we have sent instructions to reset your password.
            </p>
          </div>
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full rounded-xl">
              Return to Login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Email Address</label>
            <Input
              type="email"
              placeholder="you@oau.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl font-semibold shadow-md mt-2"
          >
            {isLoading ? "Sending link..." : "Send Reset Link"}
          </Button>

          <div className="text-center pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-notari-primary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}
