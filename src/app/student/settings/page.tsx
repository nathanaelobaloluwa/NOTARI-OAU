"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Shield, Bell, Key, Check } from "lucide-react";

export default function StudentSettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name || "Student");
  const [matric, setMatric] = useState("CSC/2021/1234");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [faculty, setFaculty] = useState("Faculty of Science");
  const [department, setDepartment] = useState("Computer Science");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  const userInitials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";

  // Toggles
  const [twoFactor, setTwoFactor] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Profile Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your personal university profile, matric details, and notification preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Personal Information Form */}
        <div className="md:col-span-7">
          <Card className="p-6 border-slate-200/80 shadow-sm bg-white space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-notari-primary flex items-center justify-center font-bold text-xl">
                {userInitials}
              </div>
              <div className="space-y-1">
                <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg">
                  Change Photo
                </Button>
                <p className="text-[11px] text-slate-400">JPG or PNG under 2MB</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={<User className="w-4 h-4" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Matric Number</label>
                <Input
                  value={matric}
                  onChange={(e) => setMatric(e.target.value)}
                  disabled
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Faculty</label>
                  <Input
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Department</label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full sm:w-auto px-6 rounded-xl text-xs font-semibold">
                  {saved ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Changes Saved!</span>
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Security & Preferences */}
        <div className="md:col-span-5 space-y-6">
          {/* Security */}
          <Card className="p-6 border-slate-200/80 shadow-sm bg-white space-y-4">
            <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-notari-primary" />
              <span>Account Security</span>
            </h3>

            <div className="space-y-3 pt-2">
              <Button variant="outline" className="w-full justify-start gap-2 text-xs font-medium h-10">
                <Key className="w-4 h-4 text-slate-500" />
                <span>Change Password</span>
              </Button>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-notari-dark block">Two-Factor Auth</span>
                  <span className="text-[11px] text-slate-400 block">Extra login verification</span>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.checked)}
                  className="rounded text-notari-primary focus:ring-notari-primary"
                />
              </div>
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-6 border-slate-200/80 shadow-sm bg-white space-y-4">
            <h3 className="text-sm font-bold text-notari-dark uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-notari-primary" />
              <span>Notification Preferences</span>
            </h3>

            <div className="space-y-3 pt-2 text-xs">
              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <span className="text-slate-700">Email Notifications</span>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="rounded text-notari-primary focus:ring-notari-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <span className="text-slate-700">Event Reminders (SMS/Email)</span>
                <input
                  type="checkbox"
                  checked={eventReminders}
                  onChange={(e) => setEventReminders(e.target.checked)}
                  className="rounded text-notari-primary focus:ring-notari-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <span className="text-slate-700">Marketing & Campus News</span>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="rounded text-notari-primary focus:ring-notari-primary"
                />
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
