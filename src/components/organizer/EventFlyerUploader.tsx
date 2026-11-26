"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotariLoader } from "@/components/shared/notari-loader";
import { MAX_FLYER_FILE_SIZE } from "@/lib/storage/validation";

export interface CampusPreset {
  url: string;
  label: string;
}

export interface EventFlyerUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  presets?: CampusPreset[];
  aspectRatio?: "video" | "wide"; // 16:9 or 16:10
}

export function EventFlyerUploader({
  value,
  onChange,
  onRemove,
  disabled = false,
  className,
  presets,
  aspectRatio = "video",
}: EventFlyerUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "presets">(
    value && presets?.some((p) => p.url === value) ? "presets" : "upload"
  );

  // Upload handler
  const handleUploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setLastSelectedFile(file);

      // Client-side quick checks
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError(
          "Unsupported format. Please select a genuine JPEG, PNG, or WebP image. SVG and executables are rejected."
        );
        return;
      }

      if (file.size > MAX_FLYER_FILE_SIZE) {
        setError(
          `Image is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.`
        );
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/organizer/flyer/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || `Upload failed with status ${res.status}`);
        }

        // Successfully uploaded!
        onChange(data.url);
        setError(null);
      } catch (err: unknown) {
        console.error("❌ Flyer upload failed:", err);
        setError((err as Error).message || "Failed to upload flyer image. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  // Drag and Drop handlers
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleUploadFile(files[0]);
      }
    },
    [disabled, isUploading, handleUploadFile]
  );

  // Trigger native file picker
  const handleBrowseClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUploadFile(files[0]);
    }
    // Reset file input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    if (disabled || isUploading) return;
    setError(null);
    setLastSelectedFile(null);
    onChange("");
    onRemove?.();
  };

  const handleRetry = () => {
    if (lastSelectedFile) {
      handleUploadFile(lastSelectedFile);
    } else {
      handleBrowseClick();
    }
  };

  const aspectClass = aspectRatio === "video" ? "aspect-video" : "aspect-[16/10]";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
        aria-label="Upload event publicity flyer"
      />

      {/* Tabs if presets provided */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === "upload"
                ? "bg-white text-[#151C35] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload Device Flyer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === "presets"
                ? "bg-white text-[#151C35] shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#20BFA9]" />
            Great Ife Campus Presets
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === "presets" && presets && presets.length > 0 ? (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {presets.map((preset) => (
              <button
                key={preset.url}
                type="button"
                onClick={() => onChange(preset.url)}
                disabled={disabled || isUploading}
                className={cn(
                  "relative aspect-video rounded-xl overflow-hidden border-2 transition-all group text-left cursor-pointer",
                  value === preset.url
                    ? "border-[#4169E1] ring-2 ring-[#4169E1]/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <Image
                  src={preset.url}
                  alt={preset.label}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                  <span className="text-[10px] font-bold text-white truncate leading-tight">
                    {preset.label}
                  </span>
                </div>
                {value === preset.url && (
                  <div className="absolute top-1.5 right-1.5 bg-[#4169E1] text-white p-0.5 rounded-full shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div className="space-y-3">
          {value ? (
            /* Selected / Uploaded Flyer Preview Card */
            <div
              className={cn(
                "relative rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900 shadow-sm group",
                aspectClass
              )}
            >
              <Image
                src={value}
                alt="Event Publicity Flyer"
                fill
                className="object-cover"
                unoptimized={value.startsWith("http")}
                sizes="(max-width: 768px) 100vw, 800px"
              />

              {/* Status Badge */}
              <div className="absolute top-3 left-3 bg-[#151C35]/90 backdrop-blur-md border border-white/20 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#20BFA9]" />
                <span>Flyer Attached</span>
              </div>

              {/* Action Toolbar Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 p-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBrowseClick}
                  disabled={disabled || isUploading}
                  className="bg-white/95 text-slate-800 hover:bg-white hover:text-[#4169E1] border-none font-semibold text-xs shadow-md"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Replace Flyer
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled || isUploading}
                  className="bg-red-600/90 hover:bg-red-600 text-white font-semibold text-xs shadow-md"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowseClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBrowseClick();
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center select-none",
                isDragging
                  ? "border-[#4169E1] bg-[#4169E1]/5 ring-4 ring-[#4169E1]/10"
                  : "border-slate-300 hover:border-[#4169E1]/70 bg-slate-50/60 hover:bg-slate-50",
                (disabled || isUploading) && "pointer-events-none opacity-60",
                aspectClass
              )}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <NotariLoader size="md" variant="electric" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#151C35]">Uploading Flyer...</p>
                    <p className="text-[11px] text-slate-500">
                      Processing and optimizing for Great Ife students
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 max-w-xs">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-[#4169E1] group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-[#151C35]">
                      Click to upload flyer <span className="font-normal text-slate-500">or drag & drop</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Supports JPEG, PNG, or WebP (max 5 MB)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 h-7 text-xs font-semibold border-slate-300 text-slate-700 bg-white shadow-2xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Browse Files
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-2 text-xs text-red-800 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="font-bold underline text-red-900 hover:text-red-950 shrink-0 ml-2"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
