import { NextRequest, NextResponse } from "next/server";
import { OtpService } from "@/lib/auth/otp-service";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { OtpPurpose } from "@/models/Otp";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/resend-otp
 * Resends a fresh 6-digit verification code with a strict 60-second cooldown.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, purpose = "registration" } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const validPurposes: OtpPurpose[] = ["registration", "login", "password_reset"];
    const targetPurpose: OtpPurpose = validPurposes.includes(purpose)
      ? purpose
      : "registration";

    await connectToDatabase();
    const user = await User.findOne({ email: normalizedEmail });

    // Prevent account enumeration by returning generic success even if user not found,
    // but do not issue an OTP for nonexistent accounts.
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: `If an account exists for ${OtpService.maskEmail(normalizedEmail)}, a new code has been sent.`,
          cooldownRemaining: 60,
        },
        { status: 200 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const result = await OtpService.createAndSendOtp({
      userId: user._id,
      email: normalizedEmail,
      name: user.name,
      purpose: targetPurpose,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          cooldownRemaining: result.cooldownRemaining,
        },
        { status: 429 } // Too Many Requests / Cooldown Active
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        cooldownRemaining: result.cooldownRemaining,
        expiresAt: result.expiresAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to resend verification code. Please try again later.",
      },
      { status: 500 }
    );
  }
}
