"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { TicketSecurityService } from "@/lib/tickets/qr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  CloudUpload,
  Users,
  SwitchCamera,
  Flashlight,
} from "lucide-react";

interface OrganizerEventSummary {
  id: string;
  title: string;
  venue: string;
  startDate: string;
  status: string;
}

interface CheckInStats {
  totalTickets: number;
  checkedInCount: number;
  remainingCount: number;
  checkInPercentage: number;
}

interface AttendeeItem {
  id: string;
  ticketCode: string;
  tierName: string;
  attendeeName: string;
  attendeeEmail: string;
  pricePaid: number;
  isCheckedIn: boolean;
  checkedInAt?: string;
  isLocallyQueued?: boolean;
}

interface ScanLogEntry {
  id: string;
  ticketCode: string;
  attendeeName?: string;
  tierName?: string;
  status: "success" | "duplicate" | "error";
  message: string;
  timestamp: string;
}

function playAudioFeedback(type: "success" | "duplicate" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "duplicate") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = "square";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Suppress audio autoplay restriction warnings
  }
}

export function OrganizerCheckInClient() {
  const [events, setEvents] = useState<OrganizerEventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "roster">("camera");

  // Check-In Statistics
  const [stats, setStats] = useState<CheckInStats>({
    totalTickets: 0,
    checkedInCount: 0,
    remainingCount: 0,
    checkInPercentage: 0,
  });

  // Camera & Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashlightOn, setIsFlashlightOn] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);

  // Scan Result Feedback Banner
  const [scanFeedback, setScanFeedback] = useState<{
    type: "success" | "duplicate" | "error";
    title: string;
    message: string;
    attendee?: string;
    tier?: string;
    code?: string;
    time?: string;
  } | null>(null);

  // Door Activity Log
  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([]);

  // Manual Check-In State
  const [manualTicketInput, setManualTicketInput] = useState<string>("");
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);

  // Attendee Roster & Offline Sync State
  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [rosterSearch, setRosterSearch] = useState<string>("");
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<Array<{ ticketCode: string; timestamp: string }>>([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Detect Network Status
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch Organizer's Events
  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch("/api/organizer/events?status=all&limit=50");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.events)) {
        const mapped = data.events.map((e: { _id?: string; id?: string; title: string; venue: string; startDate: string; status: string }) => ({
          id: e._id || e.id || "",
          title: e.title,
          venue: e.venue,
          startDate: e.startDate,
          status: e.status,
        }));
        setEvents(mapped);
        if (mapped.length > 0 && !selectedEventId) {
          setSelectedEventId(mapped[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch organizer events:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load Event Statistics
  const loadStats = useCallback(async (eventId: string) => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/check-in-stats`);
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setStats({
          totalTickets: data.data.totalTickets || 0,
          checkedInCount: data.data.checkedInCount || 0,
          remainingCount: data.data.remainingCount || 0,
          checkInPercentage: data.data.checkInPercentage || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load check-in stats:", err);
    }
  }, []);

  // Load Attendee Roster
  const loadRoster = useCallback(async (eventId: string, search = "") => {
    if (!eventId) return;
    setIsLoadingRoster(true);
    try {
      const url = `/api/organizer/events/${eventId}/attendees?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.items)) {
        setAttendees(data.items);
        // Cache roster locally for offline resilience
        try {
          localStorage.setItem(`notari_roster_${eventId}`, JSON.stringify(data.items));
        } catch {
          // Ignore localStorage quota
        }
      } else {
        // Fallback to offline cached roster
        const cached = localStorage.getItem(`notari_roster_${eventId}`);
        if (cached) {
          setAttendees(JSON.parse(cached));
        }
      }
    } catch {
      // Fallback to offline cached roster
      const cached = localStorage.getItem(`notari_roster_${eventId}`);
      if (cached) {
        setAttendees(JSON.parse(cached));
      }
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  // Update stats and roster when event changes
  useEffect(() => {
    if (selectedEventId) {
      loadStats(selectedEventId);
      loadRoster(selectedEventId);
      // Load offline queue for this event
      const storedQueue = localStorage.getItem(`notari_checkin_queue_${selectedEventId}`);
      if (storedQueue) {
        try {
          setOfflineQueue(JSON.parse(storedQueue));
        } catch {
          setOfflineQueue([]);
        }
      } else {
        setOfflineQueue([]);
      }
    }
  }, [selectedEventId, loadStats, loadRoster]);

  // Core Check-In Execution
  const processCheckIn = useCallback(
    async (
      ticketCode: string,
      signature?: string,
      scanMode: "qr" | "manual" | "offline_sync" = "qr"
    ) => {
      if (!selectedEventId || !ticketCode.trim() || isProcessingScan) return;
      setIsProcessingScan(true);

      const normalizedCode = ticketCode.trim().toUpperCase();

      // Offline mode handling
      if (isOffline) {
        const cachedRosterStr = localStorage.getItem(`notari_roster_${selectedEventId}`);
        const cachedRoster: AttendeeItem[] = cachedRosterStr ? JSON.parse(cachedRosterStr) : [];
        const match = cachedRoster.find((a) => a.ticketCode.toUpperCase() === normalizedCode);

        if (!match) {
          playAudioFeedback("error");
          setScanFeedback({
            type: "error",
            title: "Pass Not in Offline Roster",
            message: `Ticket ${normalizedCode} was not found in downloaded records. Connect to verify online.`,
          });
          setIsProcessingScan(false);
          return;
        }

        if (match.isCheckedIn) {
          playAudioFeedback("duplicate");
          setScanFeedback({
            type: "duplicate",
            title: "Already Checked In (Offline)",
            message: `This pass was previously admitted at ${match.checkedInAt || "earlier time"}.`,
            attendee: match.attendeeName,
            tier: match.tierName,
            code: match.ticketCode,
          });
          setIsProcessingScan(false);
          return;
        }

        // Add to offline queue
        const newQueueItem = { ticketCode: normalizedCode, timestamp: new Date().toISOString() };
        const updatedQueue = [...offlineQueue, newQueueItem];
        setOfflineQueue(updatedQueue);
        localStorage.setItem(`notari_checkin_queue_${selectedEventId}`, JSON.stringify(updatedQueue));

        // Mark local roster
        match.isCheckedIn = true;
        match.isLocallyQueued = true;
        match.checkedInAt = newQueueItem.timestamp;
        localStorage.setItem(`notari_roster_${selectedEventId}`, JSON.stringify(cachedRoster));
        setAttendees([...cachedRoster]);

        playAudioFeedback("success");
        setScanFeedback({
          type: "success",
          title: "Admitted Locally (Offline Queued)",
          message: "Check-in recorded locally. Will synchronize when campus connection is restored.",
          attendee: match.attendeeName,
          tier: match.tierName,
          code: match.ticketCode,
          time: new Date().toLocaleTimeString(),
        });

        setIsProcessingScan(false);
        return;
      }

      // Online Server-Side Verification
      try {
        const response = await fetch("/api/tickets/verify-and-check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: selectedEventId,
            ticketCode: normalizedCode,
            signature,
            scanMode,
          }),
        });

        const result = await response.json();

        if (response.status === 200 && result.success) {
          playAudioFeedback("success");
          setScanFeedback({
            type: "success",
            title: "Admission Confirmed! ✅",
            message: result.message || "Attendee successfully admitted.",
            attendee: result.ticket?.attendeeName,
            tier: result.ticket?.tierName,
            code: result.ticket?.ticketCode,
            time: result.ticket?.checkedInAt
              ? new Date(result.ticket.checkedInAt).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
          });

          // Add to activity log
          setScanLogs((prev) => [
            {
              id: `${Date.now()}-${normalizedCode}`,
              ticketCode: normalizedCode,
              attendeeName: result.ticket?.attendeeName,
              tierName: result.ticket?.tierName,
              status: "success",
              message: "Admitted",
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 24),
          ]);

          // Refresh metrics and roster
          loadStats(selectedEventId);
          loadRoster(selectedEventId);
        } else if (response.status === 409 || result.code === "ALREADY_CHECKED_IN") {
          playAudioFeedback("duplicate");
          setScanFeedback({
            type: "duplicate",
            title: "Duplicate Entrance Detected! ⚠️",
            message: result.message || "This pass was already checked in.",
            attendee: result.ticket?.attendeeName,
            tier: result.ticket?.tierName,
            code: result.ticket?.ticketCode || normalizedCode,
            time: result.ticket?.checkedInAt
              ? new Date(result.ticket.checkedInAt).toLocaleTimeString()
              : undefined,
          });

          setScanLogs((prev) => [
            {
              id: `${Date.now()}-${normalizedCode}`,
              ticketCode: normalizedCode,
              attendeeName: result.ticket?.attendeeName,
              tierName: result.ticket?.tierName,
              status: "duplicate",
              message: "Duplicate scan rejected",
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 24),
          ]);
        } else {
          playAudioFeedback("error");
          setScanFeedback({
            type: "error",
            title: "Admission Denied ❌",
            message: result.message || "Invalid or unverified ticket pass.",
            code: normalizedCode,
          });

          setScanLogs((prev) => [
            {
              id: `${Date.now()}-${normalizedCode}`,
              ticketCode: normalizedCode,
              status: "error",
              message: result.message || "Invalid pass",
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 24),
          ]);
        }
      } catch (err) {
        console.error("Check-in request failed:", err);
        playAudioFeedback("error");
        setScanFeedback({
          type: "error",
          title: "Network Connection Error",
          message: "Could not reach server. Enable offline mode or retry.",
        });
      } finally {
        setIsProcessingScan(false);
      }
    },
    [selectedEventId, isOffline, offlineQueue, isProcessingScan, loadStats, loadRoster]
  );

  // Synchronize Offline Queue
  const handleSyncOfflineQueue = async () => {
    if (!selectedEventId || offlineQueue.length === 0 || isSyncingOffline) return;
    setIsSyncingOffline(true);

    let successCount = 0;
    let conflictCount = 0;

    for (const item of offlineQueue) {
      try {
        const res = await fetch("/api/tickets/verify-and-check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: selectedEventId,
            ticketCode: item.ticketCode,
            scanMode: "offline_sync",
            offlineTimestamp: item.timestamp,
          }),
        });
        const result = await res.json();
        if (res.ok && result.success) {
          successCount++;
        } else if (res.status === 409) {
          conflictCount++;
        }
      } catch {
        // Stop if disconnected again
        break;
      }
    }

    setOfflineQueue([]);
    localStorage.removeItem(`notari_checkin_queue_${selectedEventId}`);
    loadStats(selectedEventId);
    loadRoster(selectedEventId);
    setIsSyncingOffline(false);

    alert(`Sync completed: ${successCount} confirmed admissions, ${conflictCount} conflicts resolved.`);
  };

  // Lazy-loaded QR decoder module to optimize initial route bundle size
  const jsQRDecoderRef = useRef<((
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }
  ) => { data: string } | null) | null>(null);

  const getJsQRDecoder = useCallback(async () => {
    if (!jsQRDecoderRef.current) {
      const mod = await import("jsqr");
      jsQRDecoderRef.current = (mod.default || mod) as unknown as NonNullable<typeof jsQRDecoderRef.current>;
    }
    return jsQRDecoderRef.current;
  }, []);

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    try {
      // Pre-warm the dynamic QR decoder module while camera initializes
      getJsQRDecoder().catch(() => {});

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Unable to access device camera. Please check your hardware or switch to manual entry.";
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleFlashlight = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities() as { torch?: boolean };
        if (capabilities.torch) {
          const nextState = !isFlashlightOn;
          await track.applyConstraints({
            advanced: [{ torch: nextState } as MediaTrackConstraintSet],
          });
          setIsFlashlightOn(nextState);
        } else {
          alert("Flashlight/Torch is not supported by your camera.");
        }
      } catch {
        alert("Could not toggle camera torch.");
      }
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 200);
  };

  // QR Scanning Loop using jsQR
  useEffect(() => {
    if (!isCameraActive) return;

    scanIntervalRef.current = window.setInterval(() => {
      if (
        !videoRef.current ||
        !canvasRef.current ||
        videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA ||
        isProcessingScan
      ) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoder = jsQRDecoderRef.current;
      if (!decoder) {
        getJsQRDecoder().catch(() => {});
        return;
      }

      const code = decoder(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        const parsed = TicketSecurityService.parseScannedPayload(code.data);
        if (parsed.ticketCode && parsed.ticketCode !== lastScannedCode) {
          setLastScannedCode(parsed.ticketCode);
          processCheckIn(parsed.ticketCode, parsed.signature, "qr");

          // Reset scan lock after 3 seconds
          setTimeout(() => {
            setLastScannedCode("");
          }, 3000);
        }
      }
    }, 180);

    return () => {
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [isCameraActive, isProcessingScan, lastScannedCode, processCheckIn, getJsQRDecoder]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketInput.trim()) return;
    setIsSubmittingManual(true);
    try {
      const parsed = TicketSecurityService.parseScannedPayload(manualTicketInput);
      await processCheckIn(parsed.ticketCode, parsed.signature, "manual");
      setManualTicketInput("");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header & Event Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-notari-dark tracking-tight">
              Gate Check-in Operations
            </h1>
            {isOffline ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px]">
                <WifiOff className="w-3 h-3" />
                <span>Offline Mode</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
                <Wifi className="w-3 h-3" />
                <span>Online</span>
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time QR barcode verification, fraud prevention, and door admission management.
          </p>
        </div>

        {/* Event Selector Dropdown */}
        <div className="w-full sm:w-72">
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Active Venue Event:
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={isLoadingEvents}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-notari-dark focus:ring-2 focus:ring-notari-primary outline-hidden"
          >
            {isLoadingEvents ? (
              <option>Loading events...</option>
            ) : events.length === 0 ? (
              <option value="">No events available</option>
            ) : (
              events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.venue})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Live Gate Dashboard Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Total Passes</span>
          <p className="text-xl sm:text-2xl font-extrabold text-notari-dark mt-0.5">
            {stats.totalTickets.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3.5 bg-emerald-50/50 border-emerald-200/60 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700">Checked In</span>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-0.5">
            {stats.checkedInCount.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3.5 bg-slate-50 border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Remaining</span>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-700 mt-0.5">
            {stats.remainingCount.toLocaleString()}
          </p>
        </Card>

        <Card className="p-3.5 bg-indigo-50/50 border-indigo-200/60 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-700">Attendance Rate</span>
          <p className="text-xl sm:text-2xl font-extrabold text-indigo-800 mt-0.5">
            {stats.checkInPercentage}%
          </p>
        </Card>
      </div>

      {/* Offline Queue Sync Alert Banner */}
      {offlineQueue.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>
              <strong>{offlineQueue.length} check-ins</strong> queued locally while offline.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleSyncOfflineQueue}
            disabled={isSyncingOffline || isOffline}
            className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3"
          >
            {isSyncingOffline ? "Syncing..." : "Sync to Server"}
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("camera")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "camera"
              ? "border-notari-primary text-notari-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Camera Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "manual"
              ? "border-notari-primary text-notari-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Manual Entry</span>
        </button>

        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "roster"
              ? "border-notari-primary text-notari-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Attendee Roster</span>
        </button>
      </div>

      {/* Feedback Banner on Recent Scan */}
      {scanFeedback && (
        <div
          className={`p-4 rounded-2xl border text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            scanFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : scanFeedback.type === "duplicate"
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          <div className="flex items-start gap-3">
            {scanFeedback.type === "success" && (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {scanFeedback.type === "duplicate" && (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            {scanFeedback.type === "error" && (
              <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            )}

            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base">{scanFeedback.title}</h4>
                {scanFeedback.time && (
                  <span className="text-xs font-mono opacity-75">{scanFeedback.time}</span>
                )}
              </div>
              <p className="text-xs leading-relaxed">{scanFeedback.message}</p>

              {scanFeedback.attendee && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border">
                    {scanFeedback.attendee}
                  </span>
                  {scanFeedback.tier && (
                    <span className="bg-white/80 px-2 py-0.5 rounded-md border">
                      {scanFeedback.tier}
                    </span>
                  )}
                  {scanFeedback.code && (
                    <span className="font-mono bg-white/80 px-2 py-0.5 rounded-md border">
                      {scanFeedback.code}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Camera Scanner */}
      {activeTab === "camera" && (
        <Card className="p-4 sm:p-6 border-slate-200/80 bg-white text-center space-y-4 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-notari-dark">Live Viewfinder</h3>
            <p className="text-xs text-slate-500">
              Align attendee digital QR pass within the reticle for instant verification.
            </p>
          </div>

          <div className="relative aspect-square w-full max-w-[280px] sm:max-w-xs mx-auto rounded-3xl bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden border-4 border-notari-primary/30 shadow-inner">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Reticle targeting overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-indigo-400/80 rounded-2xl animate-pulse pointer-events-none" />

                {/* Overlaid Controls */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                  <button
                    type="button"
                    onClick={toggleFlashlight}
                    className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                      isFlashlightOn
                        ? "bg-amber-400 text-slate-950"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    aria-label="Toggle flashlight"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-colors"
                    aria-label="Switch camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3 px-4">
                <Camera className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  {cameraError || "Camera is idle. Click below to start scanning."}
                </p>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex justify-center gap-3 pt-2">
            {!isCameraActive ? (
              <Button
                onClick={startCamera}
                className="rounded-xl px-5 gap-2 bg-notari-primary text-white font-semibold text-xs shadow-xs"
              >
                <Camera className="w-4 h-4" />
                <span>Start Camera Scanner</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={stopCamera}
                className="rounded-xl px-5 gap-2 text-xs font-semibold text-slate-700"
              >
                <span>Stop Camera</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* TAB 2: Manual Entry */}
      {activeTab === "manual" && (
        <Card className="p-6 border-slate-200/80 bg-white space-y-5 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-notari-dark">Manual Ticket Verification</h3>
            <p className="text-xs text-slate-500">
              Type or paste the ticket code (e.g. <code>NOT-OAU-8F32K9A1C4E7</code>) or full verification URL.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="NOT-OAU-..."
                value={manualTicketInput}
                onChange={(e) => setManualTicketInput(e.target.value)}
                className="uppercase font-mono font-bold tracking-wider h-11 text-sm text-center sm:text-left"
              />
              <Button
                type="submit"
                disabled={!manualTicketInput.trim() || isSubmittingManual || isProcessingScan}
                className="rounded-xl px-5 h-11 bg-notari-primary text-white font-semibold text-xs shrink-0"
              >
                {isSubmittingManual || isProcessingScan ? "Checking..." : "Admit Attendee"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: Attendee Roster & Door List */}
      {activeTab === "roster" && (
        <Card className="p-4 sm:p-6 border-slate-200/80 bg-white space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-notari-dark">Attendee Gate Roster</h3>
              <p className="text-xs text-slate-500">
                Search attendees by name, email, or ticket code to admit directly.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedEventId && loadRoster(selectedEventId, rosterSearch)}
              className="rounded-lg h-8 gap-1.5 text-xs text-slate-600 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Search by student name, matric number, or ticket code..."
              value={rosterSearch}
              onChange={(e) => {
                setRosterSearch(e.target.value);
                if (selectedEventId) loadRoster(selectedEventId, e.target.value);
              }}
              className="pl-9 h-10 text-xs"
            />
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Attendee</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Ticket Code</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingRoster ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading attendee list...
                    </td>
                  </tr>
                ) : attendees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No attendees found for this event.
                    </td>
                  </tr>
                ) : (
                  attendees.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-notari-dark">
                        {a.attendeeName}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {a.attendeeEmail}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{a.tierName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {a.ticketCode}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {a.isCheckedIn ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Admitted
                          </Badge>
                        ) : a.isLocallyQueued ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            Queued
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!a.isCheckedIn && !a.isLocallyQueued && (
                          <Button
                            size="sm"
                            disabled={isProcessingScan}
                            onClick={() => processCheckIn(a.ticketCode, undefined, "manual")}
                            className="h-7 text-[11px] rounded-lg px-2.5 bg-notari-primary text-white font-semibold"
                          >
                            Check In
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Door Activity Log */}
      {scanLogs.length > 0 && (
        <Card className="p-4 sm:p-5 border-slate-200/80 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Recent Door Scans
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Last {scanLogs.length} attempts</span>
          </div>

          <div className="space-y-2">
            {scanLogs.slice(0, 8).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  {log.status === "success" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  {log.status === "duplicate" && (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  {log.status === "error" && (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-mono font-bold text-notari-dark">{log.ticketCode}</span>
                  {log.attendeeName && (
                    <span className="text-slate-600">({log.attendeeName})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                  <span>{log.message}</span>
                  <span>•</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

