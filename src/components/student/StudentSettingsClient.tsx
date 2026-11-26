"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Shield,
  Key,
  Check,
  Lock,
  Phone,
  School,
  Building,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Bell,
  Laptop,
  Send,
} from "lucide-react";
import { SanitizedStudentProfile } from "@/lib/student/service";
import { OAU_FACULTIES, formatFacultyLabel } from "@/constants/oau";
import { ProfilePhotoManager } from "@/components/shared/profile-photo-manager";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  getNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  NotificationPermissionState,
} from "@/lib/notifications/browser-notification";

interface StudentSettingsClientProps {
  initialProfile: SanitizedStudentProfile;
}

export function StudentSettingsClient({ initialProfile }: StudentSettingsClientProps) {
  const router = useRouter();

  // Profile form state
  const [profile, setProfile] = useState<SanitizedStudentProfile>(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [faculty, setFaculty] = useState(initialProfile.faculty || "");
  const [department, setDepartment] = useState(initialProfile.department || "");

  // Status indicators for profile update
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status indicators for password update
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Preferences state (defaulted to true for all registered users)
  const [eventReminders, setEventReminders] = useState(
    initialProfile.emailPreferences?.eventReminders ?? true
  );
  const [campusAnnouncements, setCampusAnnouncements] = useState(
    initialProfile.emailPreferences?.campusAnnouncements ?? true
  );
  const [browserNotifications, setBrowserNotifications] = useState(
    initialProfile.emailPreferences?.browserNotifications ?? true
  );
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>("default");
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSuccessMsg, setPrefsSuccessMsg] = useState<string | null>(null);
  const [prefsErrorMsg, setPrefsErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setPermissionState(getNotificationPermission());
  }, []);

  const handleEnableBrowserNotifications = async () => {
    const status = await requestBrowserNotificationPermission();
    setPermissionState(status);
    if (status === "granted") {
      setBrowserNotifications(true);
      showBrowserNotification({
        title: "NOTARI 2.0 Notifications Enabled",
        body: "Real-time campus event alerts are now active with your official NOTARI brand emblem.",
        url: "/student/settings",
      });
    }
  };

  const handleTestNotification = () => {
    if (permissionState !== "granted") {
      handleEnableBrowserNotifications();
      return;
    }
    setIsTestingNotification(true);
    showBrowserNotification({
      title: "NOTARI 2.0 Campus Alert",
      body: "Desktop notification test successful! Branded with the authentic NOTARI geometric emblem.",
      url: "/student",
    });
    setTimeout(() => setIsTestingNotification(false), 1200);
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          faculty: faculty.trim() || undefined,
          department: department.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setProfileErrorMsg(data.message || "Failed to update profile. Check your input.");
      } else {
        setProfile(data.data);
        setProfileSuccessMsg("Your profile information has been saved successfully!");
        router.refresh();
      }
    } catch {
      setProfileErrorMsg("Network error occurred while saving profile changes.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("New password and confirmation password do not match.");
      setIsSavingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErrorMsg("New password must be at least 8 characters long.");
      setIsSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/student/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasswordErrorMsg(data.message || "Failed to update password.");
      } else {
        setPasswordSuccessMsg("Password changed successfully! Keep your credentials safe.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordErrorMsg("Network error occurred while changing password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Notification Preferences Update
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setPrefsSuccessMsg(null);
    setPrefsErrorMsg(null);

    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          emailPreferences: {
            eventReminders,
            campusAnnouncements,
            browserNotifications,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPrefsErrorMsg(data.message || "Failed to update notification preferences.");
      } else {
        setProfile(data.data);
        setPrefsSuccessMsg("Notification preferences updated successfully!");
        router.refresh();
      }
    } catch {
      setPrefsErrorMsg("Network error occurred while saving notification preferences.");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Profile & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage your personal university profile, contact information, and security credentials on NOTARI 2.0.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Personal Information Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Profile Photograph Upload & Management Section */}
          <ProfilePhotoManager
            currentPhotoUrl={profile.image || profile.profilePhotoUrl}
            userName={profile.name}
            userRole="student"
            onPhotoUpdated={(newUrl) => {
              setProfile((prev) => ({
                ...prev,
                image: newUrl || undefined,
                profilePhotoUrl: newUrl || undefined,
              }));
            }}
          />

          <Card className="p-5 sm:p-6 border-slate-200/80 shadow-sm bg-white space-y-6 rounded-2xl">
            {/* Avatar Snapshot Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
              <UserAvatar
                src={profile.image || profile.profilePhotoUrl}
                name={profile.name}
                size="lg"
                variant="student"
                className="w-14 h-14 sm:w-16 sm:h-16 text-lg sm:text-xl"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-notari-dark truncate">
                    {profile.name}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Student Account
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 truncate">{profile.email}</p>
              </div>
            </div>

            {/* Profile Success / Error Alerts */}
            {profileSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}
            {profileErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Obaloluwa Ajekiigbe"
                    className="pl-10 h-10 rounded-xl text-xs bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Locked Field: Matriculation Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Matriculation Number</label>
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Official University ID (Locked)</span>
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={profile.matricNumber || "NOT ASSIGNED"}
                    disabled
                    className="pl-10 h-10 rounded-xl text-xs bg-slate-100/80 font-mono text-slate-600 cursor-not-allowed border-slate-200"
                  />
                </div>
              </div>

              {/* Locked Field: Email Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">University Email Address</label>
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Primary Account Email (Locked)</span>
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={profile.email}
                    disabled
                    className="pl-10 h-10 rounded-xl text-xs bg-slate-100/80 text-slate-600 cursor-not-allowed border-slate-200"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Phone Number (Optional)</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., 08012345678 or +234..."
                    className="pl-10 h-10 rounded-xl text-xs bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Faculty & Department Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Faculty</label>
                  <div className="relative flex items-center">
                    <School className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <select
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-notari-primary/20 cursor-pointer"
                    >
                      <option value="">Select your Faculty</option>
                      {OAU_FACULTIES.map((fac) => (
                        <option key={fac} value={fac}>
                          {formatFacultyLabel(fac)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Department</label>
                  <div className="relative flex items-center">
                    <Building className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g., Computer Science & Eng"
                      className="pl-10 h-10 rounded-xl text-xs bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full sm:w-auto px-6 h-10 rounded-xl text-xs font-semibold gap-2 shadow-sm"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Security (Password Change) & Notification Preferences (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security & Password Change */}
          <Card className="p-5 sm:p-6 border-slate-200/80 shadow-sm bg-white space-y-4 rounded-2xl">
            <h3 className="text-xs font-bold text-notari-dark uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-notari-primary" />
              <span>Change Password</span>
            </h3>

            {/* Password Success / Error Alerts */}
            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}
            {passwordErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-1">
              {/* Current Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Current Password</label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="pl-10 pr-10 h-10 rounded-xl text-xs bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">New Password</label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min. 8 chars, 1 uppercase, 1 digit"
                    className="pl-10 pr-10 h-10 rounded-xl text-xs bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight pt-0.5">
                  Must be at least 8 characters with 1 uppercase letter and 1 number.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
                <div className="relative flex items-center">
                  <Key className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your new password"
                    className="pl-10 pr-10 h-10 rounded-xl text-xs bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSavingPassword}
                  className="w-full h-10 rounded-xl text-xs font-semibold gap-2 shadow-sm"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Notification Preferences */}
          <Card className="p-5 sm:p-6 border-slate-200/80 shadow-sm bg-white space-y-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-notari-dark uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-notari-primary" />
                <span>Notification & Alert Preferences</span>
              </h3>
              <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                Default: Enabled
              </Badge>
            </div>

            <p className="text-[11px] text-slate-500">
              Registered students receive event reminders and announcements by default. You can adjust your preferences below at any time.
            </p>

            {/* Preferences Success / Error Alerts */}
            {prefsSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{prefsSuccessMsg}</span>
              </div>
            )}
            {prefsErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{prefsErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePreferencesSubmit} className="space-y-3 pt-1 text-xs">
              {/* Desktop / Browser Push Notifications */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Desktop & Browser Alerts</span>
                      </span>
                      {permissionState === "granted" ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          Branded Icon Active
                        </span>
                      ) : permissionState === "denied" ? (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                          Blocked in Browser
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          Permission Needed
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Displays desktop alerts with the official NOTARI geometric logo instead of the default Chrome icon.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={browserNotifications}
                    onChange={(e) => setBrowserNotifications(e.target.checked)}
                    className="rounded text-notari-primary focus:ring-notari-primary w-4 h-4 cursor-pointer shrink-0"
                  />
                </div>

                {/* Desktop Notification Actions: Request Permission or Send Test */}
                <div className="pt-1 flex items-center gap-2">
                  {permissionState === "granted" ? (
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      disabled={isTestingNotification}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-notari-primary hover:border-notari-primary/30 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-indigo-600" />
                      <span>{isTestingNotification ? "Sending Test..." : "Test Desktop Alert"}</span>
                    </button>
                  ) : permissionState === "denied" ? (
                    <span className="text-[10px] text-slate-500 italic">
                      To unblock: Click the site settings icon in your Chrome address bar and set Notifications to &quot;Allow&quot;.
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnableBrowserNotifications}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-notari-primary text-white hover:bg-notari-primary/90 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Enable Desktop Notifications</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Event Reminders */}
              <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                <div className="space-y-0.5 pr-2">
                  <span className="font-semibold text-slate-700 block">Event Reminders</span>
                  <span className="text-[11px] text-slate-400 block">
                    Day-before reminders for your registered campus events.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={eventReminders}
                  onChange={(e) => setEventReminders(e.target.checked)}
                  className="rounded text-notari-primary focus:ring-notari-primary w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Campus Announcements */}
              <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                <div className="space-y-0.5 pr-2">
                  <span className="font-semibold text-slate-700 block">Campus Life Announcements</span>
                  <span className="text-[11px] text-slate-400 block">
                    OAU student symposiums, summits, and campus news.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={campusAnnouncements}
                  onChange={(e) => setCampusAnnouncements(e.target.checked)}
                  className="rounded text-notari-primary focus:ring-notari-primary w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Mandatory / Essential Transactional Emails */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 opacity-90">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 block">Transactional Emails</span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Essential
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Ticket passes, payment receipts, and refund updates are mandatory per university policy.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="rounded text-notari-primary focus:ring-notari-primary w-4 h-4 cursor-not-allowed opacity-60"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSavingPrefs}
                  className="w-full h-10 rounded-xl text-xs font-semibold gap-2 shadow-sm"
                >
                  {isSavingPrefs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Preferences...</span>
                    </>
                  ) : (
                    <span>Save Notification Preferences</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
