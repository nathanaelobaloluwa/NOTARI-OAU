import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthorizationError, ForbiddenError } from "@/lib/auth/rbac";
import { verifyAndCheckInSchema } from "@/validators/check-in";
import { verifyAndCheckInTicket } from "@/lib/tickets/check-in";

/**
 * POST /api/tickets/verify-and-check-in
 * Secure server-side gate check-in endpoint for scanned QR codes and manual entries.
 * Enforces cryptographic HMAC-SHA256 signature verification, event scoping,
 * and atomic concurrency locking to prevent duplicate entrance.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await req.json();
    const validation = verifyAndCheckInSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Invalid check-in request payload.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { eventId, ticketCode, signature, scanMode, offlineTimestamp } = validation.data;

    const result = await verifyAndCheckInTicket({
      eventId,
      ticketCode,
      operatorId: user.id,
      operatorName: user.name,
      signature,
      scanMode,
      offlineTimestamp,
    });

    return NextResponse.json(result, { status: result.status });
  } catch (error: unknown) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: error.message },
        { status: 401 }
      );
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, code: "FORBIDDEN", message: error.message },
        { status: 403 }
      );
    }

    console.error("❌ Unexpected error during ticket check-in:", error);
    return NextResponse.json(
      {
        success: false,
        code: "SERVER_ERROR",
        message: "An internal server error occurred while verifying the ticket.",
      },
      { status: 500 }
    );
  }
}

