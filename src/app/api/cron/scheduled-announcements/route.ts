import { NextRequest, NextResponse } from "next/server";
import { announcementService } from "@/services/announcement.service";
import { authorizeCronRequest } from "@/lib/auth/cron";

export const dynamic = "force-dynamic";

async function handleScheduledAnnouncementsCron(req: NextRequest) {
  const isAuthorized = await authorizeCronRequest(req);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Valid CRON_SECRET or Admin session required." },
      { status: 401 }
    );
  }

  try {
    const result = await announcementService.publishDueScheduledAnnouncements();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [CRON_SCHEDULED_ANNOUNCEMENTS_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to publish scheduled announcements", error: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleScheduledAnnouncementsCron(req);
}

export async function POST(req: NextRequest) {
  return handleScheduledAnnouncementsCron(req);
}
