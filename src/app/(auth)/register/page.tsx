"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { OAU_FACULTIES } from "@/constants/oau";
import { User, Mail, Lock, Building, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (accountType === "organizer") {
        router.push("/organizer");
      } else {
        router.push("/student");
      }
    }, 600);
  };

  return (
    <Card className="p-8 border-slate-200/80 shadow-lg bg-white rounded-2xl">
      <div className="space-y-2 text-center sm:text-left mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-notari-dark">
          Create an Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Join the official OAU event network as a student or campus organizer
        </p>
      </div>

      {/* Account Type Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setAccountType("student")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
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
          onClick={() => setAccountType("organizer")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
            accountType === "organizer"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-slate-600 hover:text-notari-dark"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Campus Organizer</span>
        </button>
      </div>

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
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">OAU Email Address</label>
              <Input
                type="email"
                placeholder="adeola.johnson@oau.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Matric No.</label>
                <Input
                  type="text"
                  placeholder="CSC/2021/045"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Faculty</label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-notari-dark focus:outline-none focus:ring-2 focus:ring-notari-primary/20"
                  required
                >
                  <option value="">Select Faculty</option>
                  {OAU_FACULTIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
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
              />
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Create Password</label>
          <Input
            type="password"
            placeholder="Min. 8 characters with numbers"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl font-semibold shadow-md mt-2"
        >
          {isLoading ? "Creating account..." : "Complete Registration"}
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
