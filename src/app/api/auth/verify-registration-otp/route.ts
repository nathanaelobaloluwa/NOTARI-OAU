import { NextRequest, NextResponse } from "next/server";
import { OtpService } from "@/lib/auth/otp-service";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-registration-otp
 * Verifies a 6-digit registration code and marks the user's account as verified.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const cleanCode = String(code).trim();

    // 1. Verify OTP with cryptographic security checks (expiry, max attempts, timing-safe hash)
    const verification = await OtpService.verifyOtp({
      email: normalizedEmail,
      code: cleanCode,
      purpose: "registration",
    });

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          message: verification.message,
          reason: verification.reason,
          remainingAttempts: verification.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // 2. Mark account as verified in MongoDB
    await connectToDatabase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: "Email address verified successfully! You can now log in to NOTARI.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Registration OTP verification error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred during verification. Please try again.",
      },
      { status: 500 }
    );
  }
}
