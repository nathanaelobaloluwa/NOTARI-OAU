"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, Camera } from "lucide-react";

export default function OrganizerCheckInScannerPage() {
  const [ticketCode, setTicketCode] = useState("");
  const [scanResult, setScanResult] = useState<{
    valid: boolean;
    name?: string;
    tier?: string;
    matric?: string;
  } | null>(null);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode) return;

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
      <Card className="p-8 border-slate-200/80 bg-white text-center space-y-4">
        <div className="relative aspect-square max-w-xs mx-auto rounded-3xl bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden border-4 border-purple-600/30">
          <div className="absolute inset-8 border-2 border-dashed border-purple-400 rounded-2xl animate-pulse" />
          <Camera className="w-12 h-12 text-purple-400 mb-2" />
          <span className="text-xs font-semibold text-slate-300">Point Camera at Attendee QR Code</span>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">or manual alphanumeric entry</span>
          </div>
        </div>

        <form onSubmit={handleVerify} className="flex gap-2">
          <Input
            placeholder="e.g. NOT-OAU-8F32K"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            className="uppercase font-mono text-center font-bold tracking-wider"
          />
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-xs px-5">
            Verify Pass
          </Button>
        </form>
      </Card>

      {/* Verification Result Notification */}
      {scanResult && (
        <Card
          className={`p-6 border ${
            scanResult.valid
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {scanResult.valid ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Valid Ticket • Check-in Approved</h4>
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
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Invalid or Expired Ticket</h4>
                <p className="text-xs text-rose-700">
                  The ticket code was not found for this event or has already been used.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
