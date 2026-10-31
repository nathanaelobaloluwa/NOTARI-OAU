"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { MOCK_STUDENT_TICKETS } from "@/lib/mock-data";
import { Calendar, MapPin, QrCode, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentTicketsPage() {
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [selectedTicket, setSelectedTicket] = useState<(typeof MOCK_STUDENT_TICKETS)[0] | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
          My Tickets
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Your active event passes, QR check-in codes, and booking receipts.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
        {(["upcoming", "past", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all text-center",
              tab === t
                ? "bg-white text-notari-primary shadow-sm"
                : "text-slate-600 hover:text-notari-dark"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {MOCK_STUDENT_TICKETS.map((tkt) => (
          <Card
            key={tkt.id}
            className="p-5 border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-notari-primary shrink-0">
                <QrCode className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusPill status={tkt.status} />
                  <span className="text-xs text-slate-400 font-mono">{tkt.ticketCode}</span>
                </div>
                <h3 className="text-base font-bold text-notari-dark">{tkt.eventTitle}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tkt.eventDate}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tkt.venue}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTicket(tkt)}
                className="gap-2 text-xs font-semibold"
              >
                <QrCode className="w-4 h-4" />
                <span>View QR Code</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* TICKET PREVIEW MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-[340px] sm:max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close pass modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pr-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-notari-primary">
                Digital Pass
              </span>
              <h3 className="text-base sm:text-lg font-bold text-notari-dark line-clamp-1">
                {selectedTicket.eventTitle}
              </h3>
              <p className="text-xs text-slate-500">{selectedTicket.tierName}</p>
            </div>

            {/* Simulated QR Code Canvas */}
            <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-36 h-36 sm:w-44 sm:h-44 bg-white p-2.5 sm:p-3 rounded-xl shadow-inner flex flex-col items-center justify-center text-center">
                <QrCode className="w-24 h-24 sm:w-32 sm:h-32 text-notari-dark" />
                <span className="text-[10px] font-mono font-bold text-slate-600 mt-1">
                  {selectedTicket.ticketCode}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-2">
                Scan at the venue entrance
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Attendee:</span>
                <span className="font-semibold text-notari-dark">Adeola Johnson</span>
              </div>
              <div className="flex justify-between">
                <span>Venue:</span>
                <span className="font-semibold text-notari-dark truncate max-w-[180px]">{selectedTicket.venue}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-600 font-semibold">Verified Pass</span>
              </div>
            </div>

            <Button
              className="w-full h-11 rounded-xl gap-2 text-xs font-semibold shadow-sm"
              onClick={() => setSelectedTicket(null)}
            >
              <Download className="w-4 h-4" />
              <span>Save Ticket to Phone</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
