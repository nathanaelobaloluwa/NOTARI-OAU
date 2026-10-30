import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Sparkles, Ticket, Users, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-notari-primary bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          About NOTARI 2.0
        </span>
        <h1 className="text-4xl font-extrabold text-notari-dark tracking-tight">
          Empowering Great Ife Through Meaningful Campus Experiences.
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          NOTARI 2.0 is the official campus event discovery, ticketing, and verification platform purpose-built for the vibrant student body and organizations of Obafemi Awolowo University (OAU), Ile-Ife.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-notari-primary flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-notari-dark">Seamless Digital Passes</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Instant digital ticket generation with secure cryptographically signed QR codes. No more paper passes or lost receipts.
          </p>
        </Card>

        <Card className="p-6 border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-notari-dark">Organizer Empowerment</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tools for university faculties, departments, and registered student associations to schedule, publish, promote, and manage attendees.
          </p>
        </Card>

        <Card className="p-6 border-slate-200/80 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-notari-dark">Superadmin Governance</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Centralized platform oversight ensuring genuine campus events, secure payments, and safe student participation.
          </p>
        </Card>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Ready to experience Great Ife events?</h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          Create your student account today using your university email to discover and reserve passes for upcoming campus activities.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link href="/register">
            <Button size="lg" className="rounded-xl px-8 font-semibold">
              Get Started
            </Button>
          </Link>
          <Link href="/events">
            <Button size="lg" variant="outline" className="rounded-xl px-8 text-white border-slate-700 hover:bg-slate-800">
              Browse Events
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
