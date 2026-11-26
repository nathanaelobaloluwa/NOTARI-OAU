"use client";

import React, { useEffect, useState } from "react";
import { toastManager, ToastItem } from "@/lib/toast";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe((items) => {
      setToasts(items);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-50 flex flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        toastManager.dismiss(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration]);

  const isAlert = toast.type === "error" || toast.type === "warning";

  return (
    <div
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl bg-white text-slate-800 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2",
        toast.type === "success" && "border-emerald-200/90 shadow-emerald-950/5",
        toast.type === "error" && "border-rose-200/90 shadow-rose-950/5",
        toast.type === "warning" && "border-amber-200/90 shadow-amber-950/5",
        toast.type === "info" && "border-blue-200/90 shadow-blue-950/5",
        toast.type === "loading" && "border-slate-200/90 shadow-slate-950/5"
      )}
    >
      {/* Icon afforance */}
      <div className="shrink-0 mt-0.5">
        {toast.type === "success" && (
          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        )}
        {toast.type === "error" && (
          <div className="w-6 h-6 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
        )}
        {toast.type === "warning" && (
          <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        )}
        {toast.type === "info" && (
          <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-notari-primary">
            <Info className="w-3.5 h-3.5" />
          </div>
        )}
        {toast.type === "loading" && (
          <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-notari-primary">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <h5 className="text-xs font-bold text-notari-dark leading-tight">
          {toast.title}
        </h5>
        {toast.description && (
          <p className="text-[11px] text-slate-500 mt-1 leading-normal break-words">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="mt-2 text-[11px] font-bold text-notari-primary hover:underline cursor-pointer"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => toastManager.dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
