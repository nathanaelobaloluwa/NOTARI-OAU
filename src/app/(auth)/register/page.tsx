"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { OAU_FACULTIES, formatFacultyLabel } from "@/constants/oau";
import { User, Mail, Lock, Building, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotariLoader } from "@/components/shared/notari-loader";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"student" | "organizer">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faculty, setFaculty] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const payload = {
        name: accountType === "student" ? name.trim() : `${name.trim()} (${orgName.trim()})`,
        email: email.toLowerCase().trim(),
        password,
        faculty: faculty || undefined,
        matricNumber: matricNumber ? matricNumber.toUpperCase().trim() : undefined,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data?.message || (data?.errors && typeof data.errors === "string" ? data.errors : "Registration failed. Please check your inputs.")
        );
        setIsLoading(false);
        return;
      }

      // Successful registration: Redirect to login with confirmation
      router.push("/login?registered=true");
    } catch (err) {
      console.error("Registration error:", err);
      setErrorMessage("Network error during registration. Please verify your connection.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-5 sm:p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl">
      <div className="space-y-1.5 text-center sm:text-left mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-notari-dark">
          Create an Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Join the official OAU event network as a student or campus organizer
        </p>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Account Type Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            setAccountType("student");
            setErrorMessage(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all disabled:opacity-50",
            accountType === "student"
              ? "bg-white text-notari-primary shadow-sm"
              : "text-slate-600 hover:text-notari-dark"
          )}
        >
          <User className="w-3.5 h-3.5" />
          <span>Student Account</span>
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            setAccountType("organizer");
            setErrorMessage(null);
          }}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-lg transition-all disabled:opacity-50",
            accountType === "organizer"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-slate-600 hover:text-notari-dark"
          )}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Campus Organizer</span>
        </button>
      </div>

      {accountType === "organizer" && (
        <div className="mb-5 p-3 rounded-xl bg-purple-50 border border-purple-200/60 flex items-start gap-2.5 text-xs text-purple-900">
          <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <span>
            Organizer accounts require administrative verification. Register your official representative account below to initiate your application.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {accountType === "student" ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Full Name</label>
              <Input
                type="text"
                placeholder="e.g. Adeola Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="w-4 h-4" />}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">University Email Address</label>
              <Input
                type="email"
                placeholder="adeola.johnson@oau.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Matric No.</label>
                <Input
                  type="text"
                  placeholder="CSC/2021/045"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  className="h-11"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Faculty</label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  disabled={isLoading}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:outline-none focus:ring-2 focus:ring-notari-primary/20 disabled:opacity-50"
                  required
                >
                  <option value="">Select Faculty</option>
                  {OAU_FACULTIES.map((f) => (
                    <option key={f} value={f}>
                      {formatFacultyLabel(f)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Organization / Society Name</label>
              <Input
                type="text"
                placeholder="e.g. OAU Tech Innovation Club"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                icon={<Building className="w-4 h-4" />}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Official Contact Email</label>
              <Input
                type="email"
                placeholder="contact@techclub.oau.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Lead Representative Name</label>
              <Input
                type="text"
                placeholder="President or Coordinator Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="w-4 h-4" />}
                required
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Create Password</label>
          <Input
            type="password"
            placeholder="Min. 8 characters with at least 1 uppercase & 1 number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl font-semibold shadow-md mt-2 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <NotariLoader size="sm" variant="white" text="Creating your account..." />
          ) : (
            "Complete Registration"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-notari-primary hover:underline">
          Sign In
        </Link>
      </p>
    </Card>
  );
}
