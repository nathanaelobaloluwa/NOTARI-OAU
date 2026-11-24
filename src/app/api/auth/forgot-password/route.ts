import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { sendEmail } from "@/lib/email/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid university email address." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

    // For security and privacy, return a generic message even if the user is not found
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account matches that email address, password reset instructions have been sent.",
      });
    }

    // Generate cryptographically random token (32 bytes hex)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Token expires in 1 hour
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #151C35; margin: 0; font-size: 22px;">NOTARI 2.0 — Password Reset</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Obafemi Awolowo University Events & Ticketing</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello <strong>${user.name}</strong>,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password for your NOTARI account. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #151C35; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Reset My Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
          This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">
          Obafemi Awolowo University, Ile-Ife, Osun State, Nigeria<br />
          NOTARI 2.0 Security Team
        </p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "Reset your NOTARI account password",
      html: htmlContent,
      text: `Hello ${user.name},\n\nWe received a request to reset your NOTARI account password. Use this link within 1 hour to set a new password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    });

    return NextResponse.json({
      success: true,
      message: "If an account matches that email address, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}
