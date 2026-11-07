"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, X, Calendar, DollarSign, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/shared/status-pill";

interface SearchEvent {
  id: string;
  title: string;
  venue: string;
  category: string;
  status: string;
  startDate: string;
  url: string;
}

interface SearchOrder {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: string;
  tierName: string;
  url: string;
}

interface SearchAttendee {
  id: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  tierName: string;
  isCheckedIn: boolean;
  eventTitle: string;
  url: string;
}

interface SearchResults {
  events: SearchEvent[];
  orders: SearchOrder[];
  attendees: SearchAttendee[];
}

export function OrganizerHeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    events: [],
    orders: [],
    attendees: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ events: [], orders: [], attendees: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/organizer/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && data.results) {
          setResults(data.results);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Organizer search fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const totalResults =
    results.events.length + results.orders.length + results.attendees.length;

  const handleSelectResult = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim().length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder="Search events, orders, tickets, attendees..."
          className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-8 text-xs text-notari-dark placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
        />
        {loading ? (
          <Loader2 className="absolute right-3 w-3.5 h-3.5 text-purple-600 animate-spin" />
        ) : query.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden max-h-[440px] overflow-y-auto">
          {totalResults === 0 && !loading ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">No matching records found</p>
              <p className="text-[11px] text-slate-400">
                Try searching by event title, ticket code, student matric number, or payment reference.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {/* Events Section */}
              {results.events.length > 0 && (
                <div className="p-2">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-purple-600" />
                    <span>Events ({results.events.length})</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.events.map((evt) => (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => handleSelectResult(evt.url)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-notari-dark truncate group-hover:text-purple-600">
                            {evt.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {evt.venue} • {new Date(evt.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusPill status={evt.status} />
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders Section */}
              {results.orders.length > 0 && (
                <div className="p-2">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-emerald-600" />
                    <span>Orders & Payments ({results.orders.length})</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.orders.map((ord) => (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => handleSelectResult(ord.url)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-notari-dark truncate group-hover:text-emerald-600">
                            {ord.customerName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            {ord.reference} • {ord.tierName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-700">₦{ord.amount.toLocaleString()}</span>
                          <StatusPill status={ord.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendees Section */}
              {results.attendees.length > 0 && (
                <div className="p-2">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-indigo-600" />
                    <span>Attendees & Tickets ({results.attendees.length})</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.attendees.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => handleSelectResult(att.url)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-notari-dark truncate group-hover:text-indigo-600">
                            {att.attendeeName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {att.eventTitle} • <span className="font-mono">{att.ticketCode}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                              att.isCheckedIn
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {att.isCheckedIn ? "Checked In" : "Unused"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
