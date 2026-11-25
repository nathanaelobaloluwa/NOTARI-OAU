"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    // Initial check (only on browser client)
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    function handleOnline() {
      setIsOnline(true);
      if (wasOffline) {
        setShowRestored(true);
        const timer = setTimeout(() => {
          setShowRestored(false);
          setWasOffline(false);
        }, 3500);
        return () => clearTimeout(timer);
      }
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(true);
      setShowRestored(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-0 left-0 right-0 z-50 bg-[#151C35] text-white border-b border-[#EF4444]/40 px-4 py-2.5 shadow-xl flex items-center justify-center gap-3 text-xs sm:text-sm animate-in slide-in-from-top duration-300"
        >
          <div className="p-1 rounded-full bg-[#EF4444]/20 text-[#EF4444] shrink-0" aria-hidden="true">
            <WifiOff className="w-4 h-4" />
          </div>
          <span className="font-medium text-slate-200">
            You are currently offline. Some features may be unavailable until connection is restored.
          </span>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                setIsOnline(navigator.onLine);
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Check</span>
          </button>
        </aside>
      )}

      {/* Online Restored Notification */}
      {isOnline && showRestored && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-50 bg-[#10B981] text-white px-4 py-2.5 shadow-xl flex items-center justify-center gap-2 text-xs sm:text-sm animate-in slide-in-from-top fade-out duration-300"
        >
          <Wifi className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">
            Internet connection restored! You are back online.
          </span>
        </aside>
      )}

      {children}
    </>
  );
}
