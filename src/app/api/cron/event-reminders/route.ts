import { NextRequest, NextResponse } from "next/server";
import { reminderService } from "@/services/reminder.service";
import { authorizeCronRequest } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

async function handleRemindersCron(req: NextRequest) {
  const isAuthorized = await authorizeCronRequest(req);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Valid CRON_SECRET or Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const result = await reminderService.processDueEventReminders({ batchLimit: limit });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [CRON_EVENT_REMINDERS_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to process event reminders", error: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRemindersCron(req);
}

export async function POST(req: NextRequest) {
  return handleRemindersCron(req);
}
