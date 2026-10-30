"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = useState("NOTARI");
  const [university, setUniversity] = useState("Obafemi Awolowo University");
  const [supportEmail, setSupportEmail] = useState("support@notari.oau.edu.ng");
  const [contactPhone, setContactPhone] = useState("+234 801 234 5678");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101C3A] tracking-tight">
          Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Configure university branding, payout commissions, and system preferences.
        </p>
      </div>

      <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Platform Name</label>
            <Input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">University Affiliation</label>
            <Input
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Official Support Email</label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Campus Contact Phone</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 text-xs font-semibold"
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Settings Saved</span>
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
