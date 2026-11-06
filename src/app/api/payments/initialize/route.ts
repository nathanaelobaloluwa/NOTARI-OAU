import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { initializePaymentSchema } from "@/validators/payment";
import { processPaidCheckoutInitialization } from "@/lib/payments/checkout";
import { env } from "@/config/env";

/**
 * POST /api/payments/initialize
 * Initializes an authenticated student checkout session for paid tickets.
 * Reserves capacity atomically and requests authorization URL from Paystack.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user server-side
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to purchase event tickets." },
        { status: 401 }
      );
    }

    // 2. Enforce Student Role Authorization
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Only registered students can purchase student tickets. Please log in with your student account.",
        },
        { status: 403 }
      );
    }

    // 3. Parse and validate input payload
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = initializePaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { eventId, ticketTierId, quantity, callbackUrl } = validation.data;
    const defaultCallback = env.PAYSTACK_CALLBACK_URL || `${env.NEXT_PUBLIC_APP_URL}/payment/verify`;

    // 4. Delegate to checkout initialization service
    const result = await processPaidCheckoutInitialization({
      userId: session.user.id,
      userEmail: session.user.email || "",
      userName: session.user.name || "Student",
      eventId,
      ticketTierId,
      quantity,
      callbackUrl: callbackUrl || defaultCallback,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error initializing paid ticket checkout:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while initializing checkout. Please try again.",
      },
      { status: 500 }
    );
  }
}
