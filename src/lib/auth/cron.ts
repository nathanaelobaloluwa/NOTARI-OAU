import { NextRequest } from "next/server";
import crypto from "crypto";
import { env } from "@/config/env";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";

/**
 * Constant-time string equality check to defend against timing attacks.
 */
function safeCompare(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates request authorization using CRON_SECRET Bearer token, x-cron-secret header,
 * or an authenticated Administrator session.
 */
export async function authorizeCronRequest(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET || env.CRON_SECRET;

  // 1. Check Bearer token or custom header against CRON_SECRET
  if (cronSecret && cronSecret.trim().length > 0) {
    const authHeader = req.headers.get("authorization");
    const customHeader = req.headers.get("x-cron-secret");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring("Bearer ".length).trim();
      if (safeCompare(token, cronSecret.trim())) return true;
    }

    if (customHeader && safeCompare(customHeader.trim(), cronSecret.trim())) {
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
