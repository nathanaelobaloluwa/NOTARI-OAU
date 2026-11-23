import React from "react";
import { NotariLogo } from "@/components/shared/notari-logo";
import { Calendar, Ticket, Users } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white">
      {/* Left Branding Side (Desktop) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-[#151C35] via-[#10172C] to-[#0D1224] p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <NotariLogo variant="auth" isDark size="lg" />
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Welcome to NOTARI!
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
            The official digital gateway to campus events, ticket bookings, and community experiences across Obafemi Awolowo University.
          </p>

          <div className="space-y-4 pt-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-400">
                <Calendar className="w-4 h-4" />
              </div>
              <span>Discover Great Ife events</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-purple-400">
                <Ticket className="w-4 h-4" />
              </div>
              <span>Reserve & access digital QR tickets</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
              <span>Connect with campus organizations</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 pt-8 border-t border-white/10">
          <span>Obafemi Awolowo University, Ile-Ife, Nigeria</span>
        </div>
      </div>

      {/* Right Form Area */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center px-3.5 py-6 sm:p-12 bg-notari-bg lg:bg-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="lg:hidden flex justify-center pb-2">
            <NotariLogo variant="public" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
