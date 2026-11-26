"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { USER_ROLES } from "@/constants/roles";
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Plus,
  Minus,
  ShieldCheck,
  X,
  CreditCard,
  Lock,
} from "lucide-react";

export interface SerializedTicketTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
  description?: string;
  maxPerOrder: number;
  salesStartDate?: string | Date;
  salesEndDate?: string | Date;
}

export interface EventBookingCardProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  venue: string;
  formattedDate: string;
  formattedTime: string;
  organizerName: string;
  isFree: boolean;
  ticketTiers: SerializedTicketTier[];
  sessionUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

export function EventBookingCard({
  eventId,
  eventSlug,
  eventTitle,
  venue,
  formattedDate,
  formattedTime,
  organizerName,
  isFree,
  ticketTiers,
  sessionUser,
}: EventBookingCardProps) {
  const router = useRouter();

  // Tier selection
  const [selectedTierId, setSelectedTierId] = useState<string>(
    ticketTiers[0]?.id || ""
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    bookingReference: string;
    ticketCodes: string[];
    tierName: string;
    quantity: number;
  } | null>(null);

  // Mobile modal state
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);

  const selectedTier = ticketTiers.find((t) => t.id === selectedTierId) || ticketTiers[0];
  const isTierFree = isFree || (selectedTier && selectedTier.price === 0);
  const tierAvailable = selectedTier ? selectedTier.available : 0;
  const isTierSoldOut = tierAvailable <= 0;
  const maxAllowedQuantity = selectedTier
    ? Math.min(tierAvailable, selectedTier.maxPerOrder || 5, 10)
    : 1;

  const now = new Date();
  const salesNotStarted = selectedTier?.salesStartDate
    ? new Date(selectedTier.salesStartDate) > now
    : false;
  const salesEnded = selectedTier?.salesEndDate
    ? new Date(selectedTier.salesEndDate) < now
    : false;
  const totalPrice = (selectedTier?.price || 0) * quantity;

  const totalCapacity = ticketTiers.reduce((acc, t) => acc + t.capacity, 0);
  const totalAvailable = ticketTiers.reduce((acc, t) => acc + t.available, 0);
  const isEventSoldOut = totalCapacity > 0 && totalAvailable <= 0;

  const lowestPrice = isFree
    ? 0
    : ticketTiers.length > 0
    ? Math.min(...ticketTiers.map((t) => t.price))
    : 0;

  const priceDisplay = isFree || lowestPrice === 0 ? "Free Admission" : `₦${lowestPrice.toLocaleString()}`;

  const handleRegister = async () => {
    if (!sessionUser) {
      router.push(`/login?callbackUrl=/events/${eventSlug}`);
      return;
    }

    if (sessionUser.role !== USER_ROLES.STUDENT) {
      setErrorMessage("Only registered students can reserve student event passes.");
      return;
    }

    if (!selectedTier) {
      setErrorMessage("Please select a ticket tier to continue.");
      return;
    }

    if (salesNotStarted) {
      setErrorMessage("Ticket sales for this tier have not started yet.");
      return;
    }

    if (salesEnded) {
      setErrorMessage("Ticket sales for this tier have ended.");
      return;
    }

    if (tierAvailable < quantity) {
      setErrorMessage("Sorry, insufficient tickets remain in this tier.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isTierFree) {
        // Free ticket registration
        const response = await fetch("/api/bookings/register-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            ticketTierId: selectedTier.id,
            quantity,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setErrorMessage(result.message || "Failed to complete registration. Please try again.");
          setIsSubmitting(false);
          return;
        }

        // Success
        setConfirmationData({
          bookingReference: result.data.bookingReference,
          ticketCodes: result.data.tickets.map((t: { ticketCode: string }) => t.ticketCode),
          tierName: selectedTier.name,
          quantity,
        });
        setIsSubmitting(false);
        router.refresh();
      } else {
        // Paid ticket checkout initialization via Paystack
        const response = await fetch("/api/payments/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            ticketTierId: selectedTier.id,
            quantity,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setErrorMessage(
            result.message || "Failed to initialize payment checkout. Please try again."
          );
          setIsSubmitting(false);
          return;
        }

        const authUrl = result.data?.authorizationUrl;
        if (!authUrl) {
          setErrorMessage("Paystack authorization URL was not received. Please try again.");
          setIsSubmitting(false);
          return;
        }

        // Redirect to Paystack secure checkout
        window.location.href = authUrl;
      }
    } catch {
      setErrorMessage("Network error occurred while reserving your ticket. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  // Render Confirmation State
  const renderConfirmation = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
        <CheckCircle2 className="w-7 h-7" />
      </div>

      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          Spot Reserved Successfully
        </span>
        <h3 className="text-lg font-extrabold text-notari-dark">You&apos;re Going!</h3>
        <p className="text-xs text-slate-500">
          Your free digital pass for <strong className="text-slate-700">{eventTitle}</strong> is confirmed.
        </p>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Booking Ref:</span>
          <span className="font-mono font-bold text-notari-dark">{confirmationData?.bookingReference}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Tier:</span>
          <span className="font-semibold text-notari-dark">{confirmationData?.tierName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Passes Issued:</span>
          <span className="font-bold text-emerald-600">{confirmationData?.quantity} Ticket(s)</span>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Link href="/student/tickets" className="w-full block">
          <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md gap-2">
            <Ticket className="w-4 h-4" />
            <span>View My Digital Pass</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </Link>
        <Link href="/student/my-events" className="w-full block">
          <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
            <span>View in Registered Events</span>
          </Button>
        </Link>
      </div>
    </div>
  );

  // Render Interactive Form
  const renderBookingForm = () => (
    <div className="space-y-5">
      {/* Price & Capacity Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 font-medium">Admission</span>
          <div className="text-2xl font-extrabold text-notari-dark mt-0.5">
            {selectedTier ? (isTierFree ? "Free Pass" : `₦${selectedTier.price.toLocaleString()}`) : priceDisplay}
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isEventSoldOut
              ? "bg-rose-50 text-rose-600 border-rose-200"
              : "bg-emerald-50 text-emerald-600 border-emerald-200"
          }`}
        >
          {isEventSoldOut ? "Sold Out" : `${totalAvailable} seats left`}
        </span>
      </div>

      {/* Tier Selector (if more than 1 tier) */}
      {ticketTiers.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-notari-dark">Select Ticket Tier</label>
          <div className="grid grid-cols-1 gap-2">
            {ticketTiers.map((tier) => {
              const isSelected = tier.id === selectedTierId;
              const isFreeThis = isFree || tier.price === 0;
              return (
                <button
                  type="button"
                  key={tier.id}
                  onClick={() => {
                    setSelectedTierId(tier.id);
                    setQuantity(1);
                    setErrorMessage(null);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? "border-notari-primary bg-indigo-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-notari-dark">{tier.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {tier.available > 0 ? `${tier.available} passes remaining` : "Sold Out"}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-notari-primary">
                    {isFreeThis ? "Free" : `₦${tier.price.toLocaleString()}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quantity Selector (for both free and paid tickets) */}
      {!isTierSoldOut && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-notari-dark">Quantity</span>
            <span className="text-[11px] text-slate-500">Max {maxAllowedQuantity} per order</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200">
            <button
              type="button"
              disabled={quantity <= 1 || isSubmitting}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-extrabold text-notari-dark">{quantity}</span>
            <button
              type="button"
              disabled={quantity >= maxAllowedQuantity || isSubmitting}
              onClick={() => setQuantity((q) => Math.min(maxAllowedQuantity, q + 1))}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Paid Order Summary Breakdown */}
      {!isTierFree && !isTierSoldOut && (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Ticket Price ({selectedTier?.name || "General"})</span>
            <span className="font-semibold text-notari-dark">₦{(selectedTier?.price || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500">
            <span>Quantity</span>
            <span className="font-semibold text-notari-dark">{quantity}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            <span className="font-bold text-notari-dark">Total Order</span>
            <span className="text-base font-extrabold text-notari-primary">
              ₦{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Action CTA Buttons */}
      <div className="space-y-2.5 pt-1">
        {isEventSoldOut || isTierSoldOut ? (
          <Button disabled className="w-full h-12 rounded-xl text-sm font-semibold opacity-60">
            Passes Sold Out
          </Button>
        ) : !sessionUser ? (
          <Link href={`/login?callbackUrl=/events/${eventSlug}`} className="w-full block">
            <Button className="w-full h-12 rounded-xl text-sm font-semibold shadow-md gap-2">
              <Ticket className="w-4 h-4" />
              <span>Sign in to Reserve Spot</span>
            </Button>
          </Link>
        ) : sessionUser.role !== USER_ROLES.STUDENT ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Organizer / Admin Session</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-700">
              You are signed in as an {sessionUser.role}. Student event tickets are reserved through student accounts.
            </p>
          </div>
        ) : salesNotStarted ? (
          <Button disabled className="w-full h-12 rounded-xl text-sm font-semibold opacity-60">
            Ticket Sales Not Started
          </Button>
        ) : salesEnded ? (
          <Button disabled className="w-full h-12 rounded-xl text-sm font-semibold opacity-60">
            Ticket Sales Closed
          </Button>
        ) : isTierFree ? (
          <Button
            onClick={handleRegister}
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl text-sm font-semibold shadow-md gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reserving Your Spot...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Free Registration</span>
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl text-sm font-semibold shadow-md gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Paystack...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 text-indigo-200" />
                  <span>Pay ₦{totalPrice.toLocaleString()} with Paystack</span>
                </>
              )}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Secured by Paystack • 256-bit SSL encryption</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Event Summary Info */}
      <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Date:</span>
          <span className="font-semibold text-notari-dark">{formattedDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Time:</span>
          <span className="font-semibold text-notari-dark">{formattedTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Venue:</span>
          <span className="font-semibold text-notari-dark truncate max-w-[180px]">{venue}</span>
        </div>
        <div className="flex justify-between">
          <span>Organizer:</span>
          <span className="font-semibold text-notari-dark truncate max-w-[180px]">{organizerName}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Booking Card */}
      <Card className="p-6 border-slate-200/90 shadow-md space-y-6 rounded-2xl bg-white hidden lg:block">
        {confirmationData ? renderConfirmation() : renderBookingForm()}
      </Card>

      {/* 2. Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3.5 sm:px-6 shadow-[0_-4px_20px_rgba(16,28,58,0.08)] pb-safe">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">
              {isTierFree ? "Admission" : `Total (${quantity} Ticket${quantity > 1 ? "s" : ""})`}
            </span>
            <span className="text-lg font-extrabold text-notari-dark">
              {isTierFree ? "Free Pass" : `₦${totalPrice.toLocaleString()}`}
            </span>
          </div>

          <div className="flex-1 max-w-[220px]">
            {confirmationData ? (
              <Link href="/student/tickets" className="w-full block">
                <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <Ticket className="w-4 h-4" />
                  <span>View Pass</span>
                </Button>
              </Link>
            ) : isEventSoldOut || isTierSoldOut ? (
              <Button disabled className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold opacity-60">
                Sold Out
              </Button>
            ) : !sessionUser ? (
              <Link href={`/login?callbackUrl=/events/${eventSlug}`} className="w-full block">
                <Button className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md gap-2">
                  <Ticket className="w-4 h-4" />
                  <span>Sign in</span>
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => setIsMobileModalOpen(true)}
                className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md gap-2"
              >
                {isTierFree ? (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>Reserve Spot</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Get Tickets</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Mobile Bottom Sheet / Modal Dialog */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-notari-dark">Reserve Your Pass</h3>
              <button
                type="button"
                onClick={() => setIsMobileModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close reservation dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {confirmationData ? renderConfirmation() : renderBookingForm()}
          </div>
        </div>
      )}
    </>
  );
}
