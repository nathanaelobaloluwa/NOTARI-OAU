"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/status-pill";
import { NotariEmptyState } from "@/components/shared/notari-empty-state";
import {
  Calendar,
  MapPin,
  QrCode,
  Download,
  X,
  Compass,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SerializedStudentTicket {
  id: string;
  bookingId: string;
  eventId: string;
  ticketCode: string;
  tierName: string;
  attendeeName: string;
  attendeeEmail: string;
  pricePaid: number;
  isCheckedIn: boolean;
  checkedInAt?: string;
  isInvalidated?: boolean;
  invalidatedReason?: string;
  qrCodeUrl?: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    venue: string;
    startDate: string;
    endDate: string;
    category: string;
    flyerUrl?: string;
    organizerName: string;
  } | null;
}

interface StudentTicketsClientProps {
  tickets: SerializedStudentTicket[];
  studentName: string;
}

export function StudentTicketsClient({ tickets, studentName }: StudentTicketsClientProps) {
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [selectedTicket, setSelectedTicket] = useState<SerializedStudentTicket | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (selectedTicket) {
      const payload = JSON.stringify({
        code: selectedTicket.ticketCode,
        eventId: selectedTicket.eventId || selectedTicket.event?.id || "",
      });
      QRCode.toDataURL(payload, {
        width: 256,
        margin: 1,
        color: {
          dark: "#101C3A",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(""));
    } else {
      setQrDataUrl("");
    }
  }, [selectedTicket]);

  // Refund Modal State
  const [refundModalTicket, setRefundModalTicket] = useState<SerializedStudentTicket | null>(null);
  const [refundReason, setRefundReason] = useState<string>("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  const now = new Date();

  // Filter tickets according to selected tab
  const filteredTickets = tickets.filter((ticket) => {
    if (tab === "all") return true;
    if (!ticket.event) return false;

    const eventEnd = ticket.event.endDate
      ? new Date(ticket.event.endDate)
      : new Date(ticket.event.startDate);

    if (tab === "upcoming") {
      return eventEnd >= now;
    }
    if (tab === "past") {
      return eventEnd < now;
    }
    return true;
  });

  const upcomingCount = tickets.filter(
    (t) => !t.event || new Date(t.event.endDate || t.event.startDate) >= now
  ).length;
  const pastCount = tickets.filter(
    (t) => t.event && new Date(t.event.endDate || t.event.startDate) < now
  ).length;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Submit refund
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalTicket) return;

    setRefundError(null);
    setRefundSuccess(null);
    setIsSubmittingRefund(true);

    try {
      const res = await fetch("/api/student/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: refundModalTicket.bookingId,
          reason: refundReason,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRefundSuccess(
          data.message || "Refund request submitted successfully. Administrator review is underway."
        );
        setTimeout(() => {
          setRefundModalTicket(null);
          setRefundSuccess(null);
          setRefundReason("");
          window.location.reload();
        }, 2000);
      } else {
        setRefundError(data.message || "Failed to submit refund request");
      }
    } catch {
      setRefundError("Network error while submitting refund request");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
            My Tickets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Your active event passes, QR check-in codes, and booking receipts.
          </p>
        </div>

        <Link href="/events">
          <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold rounded-xl w-full sm:w-auto">
            <Compass className="w-4 h-4 text-notari-primary" />
            <span>Discover Events</span>
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
        {(
          [
            { id: "upcoming", label: `Upcoming (${upcomingCount})` },
            { id: "past", label: `Past (${pastCount})` },
            { id: "all", label: `All (${tickets.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all text-center",
              tab === t.id
                ? "bg-white text-notari-primary shadow-sm"
                : "text-slate-600 hover:text-notari-dark"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <NotariEmptyState
          variant={tab === "past" ? "past" : "tickets"}
          title={
            tab === "upcoming"
              ? "No Upcoming Passes"
              : tab === "past"
              ? "No Past Event Tickets"
              : "No Tickets Found"
          }
          description={
            tab === "upcoming"
              ? "You haven't registered for any upcoming events yet. Discover exciting campus events happening at OAU."
              : "Your completed event attendance and past passes will appear here."
          }
          action={{
            label: "Browse Campus Events",
            href: "/events",
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((tkt) => {
            const eventDate = tkt.event?.startDate
              ? new Date(tkt.event.startDate).toLocaleDateString("en-NG", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Date TBD";

            const eventTime = tkt.event?.startDate
              ? new Date(tkt.event.startDate).toLocaleTimeString("en-NG", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "";

            const isEventUpcoming =
              tkt.event?.startDate && new Date(tkt.event.startDate) > new Date();

            return (
              <Card
                key={tkt.id}
                className="p-5 border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border",
                      tkt.isInvalidated
                        ? "bg-rose-50 border-rose-200 text-rose-500"
                        : "bg-indigo-50 border-indigo-100 text-notari-primary"
                    )}
                  >
                    {tkt.isInvalidated ? <Ban className="w-8 h-8" /> : <QrCode className="w-8 h-8" />}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {tkt.isInvalidated ? (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          Void / Refunded
                        </span>
                      ) : (
                        <StatusPill status={tkt.isCheckedIn ? "confirmed" : "free"} />
                      )}
                      <span className="text-xs text-slate-400 font-mono font-bold tracking-tight">
                        {tkt.ticketCode}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {tkt.tierName}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-notari-dark truncate">
                      {tkt.event?.title || "Event Pass"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {eventDate} {eventTime && `• ${eventTime}`}
                        </span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{tkt.event?.venue || "OAU Campus"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end shrink-0">
                  {/* Request Refund button for paid, active, upcoming tickets */}
                  {!tkt.isInvalidated && tkt.pricePaid > 0 && isEventUpcoming && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRefundModalTicket(tkt)}
                      className="text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl h-10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      <span>Request Refund</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTicket(tkt)}
                    disabled={tkt.isInvalidated}
                    className="gap-2 text-xs font-semibold rounded-xl h-10 w-full md:w-auto"
                  >
                    <QrCode className="w-4 h-4 text-notari-primary" />
                    <span>View QR Pass</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TICKET DIGITAL PASS MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-[360px] sm:max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close pass modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pr-6">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-notari-primary bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Digital Pass</span>
              </span>
              <h3 className="text-base sm:text-lg font-bold text-notari-dark line-clamp-1">
                {selectedTicket.event?.title || "Event Pass"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{selectedTicket.tierName} Admission</p>
            </div>

            {/* QR Code Display */}
            <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
              <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white p-3 rounded-2xl shadow-inner flex flex-col items-center justify-center text-center border border-slate-100">
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${selectedTicket.ticketCode}`}
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                  />
                ) : (
                  <QrCode className="w-28 h-28 sm:w-36 sm:h-36 text-notari-dark animate-pulse" />
                )}
                <span className="text-[10px] font-mono font-extrabold text-slate-700 tracking-wider mt-1">
                  {selectedTicket.ticketCode}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium text-center">
                Scan at the venue entrance for gate check-in
              </span>
            </div>

            {/* Ticket Metadata Breakdown */}
            <div className="space-y-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Attendee:</span>
                <span className="font-semibold text-notari-dark">{selectedTicket.attendeeName || studentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ticket Code:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-notari-dark">{selectedTicket.ticketCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedTicket.ticketCode)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                    aria-label="Copy ticket code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Venue:</span>
                <span className="font-semibold text-notari-dark truncate max-w-[180px]">
                  {selectedTicket.event?.venue || "OAU Campus"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                {selectedTicket.isCheckedIn ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Checked In</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Ready for Check-in</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <Button
                className="w-full h-11 rounded-xl gap-2 text-xs font-semibold shadow-sm"
                onClick={handlePrint}
              >
                <Download className="w-4 h-4" />
                <span>Save / Print Ticket Pass</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT REFUND REQUEST MODAL */}
      {refundModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setRefundModalTicket(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-notari-dark">Request Ticket Refund</h3>
                <p className="text-xs text-slate-500">{refundModalTicket.event?.title}</p>
              </div>
            </div>

            {refundError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {refundError}
              </div>
            )}
            {refundSuccess && (
              <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                {refundSuccess}
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-notari-dark">Refund Policy & Guidelines</p>
              <p className="text-slate-500 leading-relaxed">
                Refunds must be requested before the event start time. Upon approval, your ticket pass
                will be invalidated and ticket funds reversed via Paystack.
              </p>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Reason for Refund Request</label>
                <textarea
                  required
                  rows={3}
                  minLength={5}
                  maxLength={500}
                  placeholder="Please describe why you are requesting a refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-notari-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRefundModalTicket(null)}
                  className="rounded-xl h-10 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingRefund || refundReason.trim().length < 5}
                  className="rounded-xl h-10 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isSubmittingRefund ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Submit Refund Request</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
