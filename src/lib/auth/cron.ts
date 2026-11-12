import { NextRequest } from "next/server";
import { env } from "@/config/env";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";

/**
 * Validates request authorization using CRON_SECRET Bearer token, x-cron-secret header,
 * or an authenticated Administrator session.
 */
export async function authorizeCronRequest(req: NextRequest): Promise<boolean> {
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
