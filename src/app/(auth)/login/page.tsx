"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, User, Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthRole = "student" | "organizer" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<AuthRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock client redirection based on role tab for scaffold demonstration
    setTimeout(() => {
      setIsLoading(false);
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "organizer") {
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
          Login to Your Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter your credentials to access your NOTARI portal
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setRole("student")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
            role === "student"
              ? "bg-white text-notari-primary shadow-sm"
              : "text-slate-600 hover:text-notari-dark"
          )}
        >
          <User className="w-3.5 h-3.5" />
          <span>Student</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("organizer")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
            role === "organizer"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-slate-600 hover:text-notari-dark"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Organizer</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("admin")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all",
            role === "admin"
              ? "bg-white text-indigo-900 shadow-sm"
              : "text-slate-600 hover:text-notari-dark"
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700">Email Address</label>
          <Input
            type="email"
            placeholder={
              role === "admin"
                ? "admin@oau.edu.ng"
                : role === "organizer"
                ? "organizer@oau.edu.ng"
                : "adeola.johnson@oau.edu.ng"
            }
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
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
          {isLoading ? "Signing in..." : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400">or quick sample login</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setEmail("adeola.johnson@oau.edu.ng");
            setPassword("password123");
            setRole("student");
          }}
          className="py-2 text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Demo Student
        </button>
        <button
          type="button"
          onClick={() => {
            setEmail("campusorg@oau.edu.ng");
            setPassword("password123");
            setRole("organizer");
          }}
          className="py-2 text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Demo Org
        </button>
        <button
          type="button"
          onClick={() => {
            setEmail("admin@oau.edu.ng");
            setPassword("password123");
            setRole("admin");
          }}
          className="py-2 text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Demo Admin
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
