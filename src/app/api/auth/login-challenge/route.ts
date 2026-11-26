import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { OtpService } from "@/lib/auth/otp-service";
import { createChallengeToken } from "@/lib/auth/challenge-token";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login-challenge
 * Step 1 of two-factor authentication:
 * Validates credentials against MongoDB, guards suspended and unverified accounts,
 * generates and emails a 6-digit login OTP, and returns a signed challengeToken.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    await connectToDatabase();

    // Query user with password hash explicitly selected
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Guard against suspended accounts
    if (user.status === "suspended") {
      return NextResponse.json(
        {
          success: false,
          message: "Your university account has been suspended. Please contact NOTARI administration.",
        },
        { status: 403 }
      );
    }

    // Verify submitted password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password. Please verify your credentials." },
        { status: 401 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Guard against unverified accounts
    if (!user.isVerified) {
      // Re-issue a registration verification OTP
      await OtpService.createAndSendOtp({
        userId: user._id,
        email: normalizedEmail,
        name: user.name,
        purpose: "registration",
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          requireVerification: true,
          email: normalizedEmail,
          message:
            "Your email address is not yet verified. A 6-digit verification code has been sent to your inbox.",
        },
        { status: 403 }
      );
    }

    // Issue 6-digit login OTP
    const otpResult = await OtpService.createAndSendOtp({
      userId: user._id,
      email: normalizedEmail,
      name: user.name,
      purpose: "login",
      ipAddress,
      userAgent,
    });

    // Generate signed HMAC challenge token for Step 2
    const challengeToken = createChallengeToken(user._id.toString(), normalizedEmail);

    return NextResponse.json({
      success: true,
      requireOtp: true,
      challengeToken,
      email: OtpService.maskEmail(normalizedEmail),
      rawEmail: normalizedEmail,
      cooldownRemaining: otpResult.cooldownRemaining ?? 60,
      message: otpResult.message || "A 6-digit login verification code has been sent to your email.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ Login challenge error:", errorMsg);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
