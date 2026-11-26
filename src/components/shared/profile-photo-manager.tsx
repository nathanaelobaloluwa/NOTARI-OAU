"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface ProfilePhotoManagerProps {
  currentPhotoUrl?: string | null;
  userName?: string | null;
  userRole?: "student" | "organizer" | "admin";
  onPhotoUpdated?: (url: string | null) => void;
}

export function ProfilePhotoManager({
  currentPhotoUrl,
  userName,
  userRole = "student",
  onPhotoUpdated,
}: ProfilePhotoManagerProps) {
  const { data: session, update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null | undefined>(
    currentPhotoUrl || session?.user?.image
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Client-side preliminary format check
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Please select a JPEG, PNG, or WebP image. SVG or other formats are not supported.");
      return;
    }

    // 2. Client-side size check (5 MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(
        `Selected file (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB maximum limit.`
      );
      return;
    }

    // 3. Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // 4. Send upload request
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload profile photograph.");
      }

      const newUrl = data.photoUrl;
      setPhotoUrl(newUrl);
      setPreviewUrl(null);
      setSuccessMessage("Profile photograph updated successfully.");

      // Propagate immediately to active session
      if (updateSession) {
        await updateSession({ image: newUrl });
      }

      if (onPhotoUpdated) {
        onPhotoUpdated(newUrl);
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setIsDeleting(true);

      const res = await fetch("/api/user/profile-photo", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to remove profile photograph.");
      }

      setPhotoUrl(null);
      setPreviewUrl(null);
      setSuccessMessage("Profile photograph removed. Using initials avatar.");

      // Propagate to session
      if (updateSession) {
        await updateSession({ image: null });
      }

      if (onPhotoUpdated) {
        onPhotoUpdated(null);
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeDisplayUrl = previewUrl || photoUrl;
  const hasExistingPhoto = Boolean(activeDisplayUrl && activeDisplayUrl.trim().length > 0);

  return (
    <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-notari-dark">Profile Photograph</h3>
          <p className="text-xs text-slate-500">
            Personalize your account across the NOTARI student and campus portals.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">JPG, PNG, or WebP up to 5 MB</span>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Visual Avatar & Controls */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative group">
          <UserAvatar
            src={activeDisplayUrl}
            name={userName || session?.user?.name}
            size="xl"
            variant={userRole}
            className="ring-4 ring-slate-100 shadow-md"
          />

          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">
              {hasExistingPhoto ? "Custom Photograph Active" : "No Photograph Uploaded"}
            </h4>
            <p className="text-xs text-slate-500">
              {hasExistingPhoto
                ? "Your photograph appears on your tickets, dashboard, and attendee lists."
                : "You are currently represented by your official university initials avatar."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading || isDeleting}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3.5 text-xs font-semibold gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : hasExistingPhoto ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Change Photo</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </>
              )}
            </Button>

            {hasExistingPhoto && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading || isDeleting}
                onClick={handleRemovePhoto}
                className="h-9 px-3.5 text-xs font-semibold gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
