import { NextRequest, NextResponse } from "next/server";
import { reminderService } from "@/services/reminder.service";
import { announcementService } from "@/services/announcement.service";
import { notificationService } from "@/services/notification.service";
import { authorizeCronRequest } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

/**
 * Consolidated daily cron job for NOTARI 2.0.
 * Runs once every 24 hours at 06:00 UTC on Vercel Hobby plan.
 * Executes event reminders, scheduled announcements, and email retries in sequence.
 */
async function handleDailyCron(req: NextRequest) {
  const isAuthorized = await authorizeCronRequest(req);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Valid CRON_SECRET or Admin session required." },
      { status: 401 }
    );
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // 1. Process due event reminders
  try {
    results.reminders = await reminderService.processDueEventReminders({ batchLimit: 50 });
  } catch (err: unknown) {
    results.remindersError = err instanceof Error ? err.message : String(err);
    console.error("❌ [CRON_DAILY_REMINDERS_ERROR]:", results.remindersError);
  }

  // 2. Publish due scheduled announcements
  try {
    results.announcements = await announcementService.publishDueScheduledAnnouncements();
  } catch (err: unknown) {
    results.announcementsError = err instanceof Error ? err.message : String(err);
    console.error("❌ [CRON_DAILY_ANNOUNCEMENTS_ERROR]:", results.announcementsError);
  }

  // 3. Process pending notification retries
  try {
    results.retries = await notificationService.processPendingRetries({ batchSize: 25 });
  } catch (err: unknown) {
    results.retriesError = err instanceof Error ? err.message : String(err);
    console.error("❌ [CRON_DAILY_RETRIES_ERROR]:", results.retriesError);
  }

  return NextResponse.json({
    success: true,
    ...results,
  });
}

export async function GET(req: NextRequest) {
  return handleDailyCron(req);
}

export async function POST(req: NextRequest) {
  return handleDailyCron(req);
}
