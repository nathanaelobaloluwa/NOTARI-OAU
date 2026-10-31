import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { USER_ROLES } from "@/constants/roles";
import { freeRegistrationSchema } from "@/validators/booking";
import { processFreeRegistration } from "@/lib/bookings/register-free";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user server-side
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required to register for events" },
        { status: 401 }
      );
    }

    // 2. Enforce Student Role Authorization
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== USER_ROLES.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          message: "Only registered students can reserve student event tickets. Switch to a student account to register.",
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
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = freeRegistrationSchema.safeParse(body);
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

    const { eventId, ticketTierId, quantity } = validation.data;

    // 4. Delegate to the core registration service
    const result = await processFreeRegistration({
      studentId: session.user.id,
      eventId,
      ticketTierId,
      quantity,
    });

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("❌ Free registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while processing your registration. Please try again.",
      },
      { status: 500 }
    );
  }
}
