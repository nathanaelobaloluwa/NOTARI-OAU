import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/services/notification.service";
import { env } from "@/config/env";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";

export const dynamic = "force-dynamic";

/**
 * Validates request authorization using CRON_SECRET or an authenticated superadmin session.
 */
async function authorizeCronRequest(req: NextRequest): Promise<boolean> {
  const cronSecret = env.CRON_SECRET;

  // 1. Check Bearer token or custom header against CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const customHeader = req.headers.get("x-cron-secret");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring("Bearer ".length).trim();
      if (token === cronSecret) return true;
    }

    if (customHeader && customHeader.trim() === cronSecret) {
      return true;
    }
  }

  // 2. Fallback: Authenticated Administrator session
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role === USER_ROLES.ADMIN) {
      return true;
    }
  } catch {
    // Auth check failed
  }

  // 3. In non-production without CRON_SECRET configured, allow local dev triggers
  if (process.env.NODE_ENV !== "production" && !cronSecret) {
    return true;
  }

  return false;
}

async function handleRetryCron(req: NextRequest) {
  const isAuthorized = await authorizeCronRequest(req);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Valid CRON_SECRET or Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));

    const result = await notificationService.processPendingRetries({ batchSize: limit });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ [CRON_EMAIL_RETRIES_ERROR]:", errorMsg);
    return NextResponse.json(
      { success: false, message: "Failed to process pending retries", error: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRetryCron(req);
}

export async function POST(req: NextRequest) {
  return handleRetryCron(req);
}
