"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, Camera, Flashlight, RefreshCw } from "lucide-react";

export default function OrganizerCheckInScannerPage() {
  const [ticketCode, setTicketCode] = useState("");
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [scanResult, setScanResult] = useState<{
    valid: boolean;
    name?: string;
    tier?: string;
    matric?: string;
  } | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;

    if (ticketCode.toUpperCase().includes("NOT")) {
      setScanResult({
        valid: true,
        name: "Adeola Johnson",
        tier: "General Admission",
        matric: "CSC/2021/1234",
      });
    } else {
      setScanResult({
        valid: false,
      });
    }
  };

  const handleReset = () => {
    setTicketCode("");
    setScanResult(null);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          Gate Check-in Scanner
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Scan attendee QR passes or manually verify ticket codes at the venue hall entrance.
        </p>
      </div>

      {/* Simulated Scanner Viewfinder */}
      <Card className="p-4 sm:p-6 border-slate-200/80 bg-white text-center space-y-4 shadow-sm">
        <div className="relative aspect-square w-full max-w-[260px] sm:max-w-xs mx-auto rounded-3xl bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden border-4 border-purple-600/30 shadow-inner">
          {/* Target Reticle corners */}
          <div className="absolute inset-6 sm:inset-8 border-2 border-dashed border-purple-400/80 rounded-2xl animate-pulse pointer-events-none" />

          {/* Center scan icon */}
          <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400 mb-2 relative z-10" />
          <span className="text-[11px] sm:text-xs font-semibold text-slate-300 relative z-10 px-4">
            Point camera at attendee QR code
          </span>

          {/* Viewfinder Controls Overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
            <button
              type="button"
              onClick={() => setIsFlashlightOn(!isFlashlightOn)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                isFlashlightOn
                  ? "bg-amber-400 text-slate-950"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              aria-label="Toggle flashlight"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-[10px] font-semibold text-slate-400 tracking-wider">
              or manual alphanumeric entry
            </span>
          </div>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="e.g. NOT-OAU-8F32K"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            className="uppercase font-mono text-center font-bold tracking-wider h-11 text-xs sm:text-sm"
          />
          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-xs font-semibold px-5 h-11 shrink-0 rounded-xl"
          >
            Verify Pass
          </Button>
        </form>
      </Card>

      {/* Verification Result Notification */}
      {scanResult && (
        <Card
          className={`p-4 sm:p-5 border animate-in fade-in space-y-3 ${
            scanResult.valid
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {scanResult.valid ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Valid Ticket • Check-in Approved</h4>
                <p className="text-xs text-emerald-700">
                  Attendee: <strong>{scanResult.name}</strong> ({scanResult.matric})
                </p>
                <p className="text-xs text-emerald-700">
                  Tier: <strong>{scanResult.tier}</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base">Invalid or Expired Ticket</h4>
                <p className="text-xs text-rose-700">
                  The ticket code was not found for this event or has already been used.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-emerald-200/60 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs font-semibold gap-1.5 h-9 bg-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan Next Ticket</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
