import crypto from "crypto";
import mongoose from "mongoose";
import { Otp, OtpPurpose } from "@/models/Otp";
import { connectToDatabase } from "@/lib/database/mongoose";
import { sendEmail } from "@/lib/email/client";
import {
  renderRegistrationOtpEmail,
  renderLoginOtpEmail,
  renderPasswordResetOtpEmail,
} from "@/lib/email/templates/auth-templates";

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

export interface IssueOtpResult {
  success: boolean;
  message: string;
  cooldownRemaining?: number;
  expiresAt?: Date;
  deliveryProvider?: string;
  devOtpCode?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  reason?: "not_found" | "expired" | "used" | "incorrect" | "max_attempts_exceeded";
  remainingAttempts?: number;
  userId?: string;
}

export class OtpService {
  /**
   * Cryptographically secure 6-digit random code generation
   */
  public static generateSecureCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hash OTP using SHA-256 and unique salt
   */
  public static hashCode(code: string, salt: string): string {
    return crypto.createHash("sha256").update(code + salt).digest("hex");
  }

  /**
   * Issues a secure OTP, invalidates previous codes, enforces 60s cooldown,
   * stores hashed code in MongoDB, and delivers via Resend email.
   */
  public static async createAndSendOtp(params: {
    email: string;
    name?: string;
    purpose: OtpPurpose;
    userId?: string | mongoose.Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IssueOtpResult> {
    const normalizedEmail = params.email.toLowerCase().trim();
    await connectToDatabase();

    // 1. Enforce 60-second resend cooldown on active unexpired OTP
    const latestActive = await Otp.findOne({
      email: normalizedEmail,
      purpose: params.purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (latestActive) {
      const elapsedMs = Date.now() - new Date(latestActive.createdAt).getTime();
      const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return {
          success: false,
          message: `Please wait ${remainingSec} seconds before requesting a new code.`,
          cooldownRemaining: remainingSec,
        };
      }
    }

    // 2. Invalidate all previous unused codes for this email and purpose
    await Otp.updateMany(
      {
        email: normalizedEmail,
        purpose: params.purpose,
        usedAt: null,
      },
      {
        $set: { usedAt: new Date() },
      }
    );

    // 3. Generate cryptographically secure OTP & salt
    const code = this.generateSecureCode();
    const salt = crypto.randomBytes(16).toString("hex");
    const codeHash = this.hashCode(code, salt);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 4. Save new OTP record (never stores plain code)
    await Otp.create({
      userId: params.userId,
      email: normalizedEmail,
      codeHash,
      salt,
      purpose: params.purpose,
      attempts: 0,
      maxAttempts: MAX_VERIFICATION_ATTEMPTS,
      expiresAt,
    });

    // 5. Render appropriate transactional email
    const recipientName = params.name || "Student";
    let emailData: { html: string; text: string; subject: string };

    if (params.purpose === "registration") {
      emailData = renderRegistrationOtpEmail({
        name: recipientName,
        email: normalizedEmail,
        otpCode: code,
        expiresMinutes: OTP_EXPIRY_MINUTES,
      });
    } else if (params.purpose === "login") {
      emailData = renderLoginOtpEmail({
        name: recipientName,
        email: normalizedEmail,
        otpCode: code,
        expiresMinutes: OTP_EXPIRY_MINUTES,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    } else {
      emailData = renderPasswordResetOtpEmail({
        name: recipientName,
        email: normalizedEmail,
        otpCode: code,
        expiresMinutes: OTP_EXPIRY_MINUTES,
      });
    }

    // 6. Send email via Resend / simulated test delivery
    const delivery = await sendEmail({
      to: normalizedEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (!delivery.success) {
      console.warn("⚠️ OTP email delivery notice:", delivery.error);
    }

    // In development environments, log the OTP code to the console for frictionless testing
    if (process.env.NODE_ENV !== "production") {
      console.log("\n==================================================================");
      console.log(`🔑 [NOTARI OTP CODE]: ${code}`);
      console.log(`📧 Target Recipient:  ${normalizedEmail}`);
      console.log(`🎯 Purpose:           ${params.purpose}`);
      if (!delivery.success) {
        console.log(`⚠️ Email notice:      ${delivery.error}`);
        console.log(`💡 Note: Resend test domain only delivers to account owner (${delivery.error?.includes("ajekiigbenathanael") ? "ajekiigbenathanael@gmail.com" : "your Resend email"}).`);
      }
      console.log("==================================================================\n");
    }

    return {
      success: true,
      message: `Verification code sent to ${this.maskEmail(normalizedEmail)}.`,
      cooldownRemaining: RESEND_COOLDOWN_SECONDS,
      expiresAt,
      deliveryProvider: delivery.provider,
      devOtpCode: process.env.NODE_ENV !== "production" ? code : undefined,
    };
  }

  /**
   * Validates an entered 6-digit OTP code against the salted hash.
   * Enforces single-use, max attempts, and expiration.
   */
  public static async verifyOtp(params: {
    email: string;
    code: string;
    purpose: OtpPurpose;
  }): Promise<VerifyOtpResult> {
    const normalizedEmail = params.email.toLowerCase().trim();
    const cleanCode = params.code.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return {
        success: false,
        message: "Please enter a valid 6-digit numeric verification code.",
        reason: "incorrect",
      };
    }

    await connectToDatabase();

    // 1. Find the latest active code for this email and purpose
    const activeOtp = await Otp.findOne({
      email: normalizedEmail,
      purpose: params.purpose,
      usedAt: null,
    }).sort({ createdAt: -1 });

    if (!activeOtp) {
      return {
        success: false,
        message: "No active verification code found. Please request a new code.",
        reason: "not_found",
      };
    }

    // 2. Check expiration
    if (new Date() > new Date(activeOtp.expiresAt)) {
      activeOtp.usedAt = new Date();
      await activeOtp.save();
      return {
        success: false,
        message: "This verification code has expired. Please request a new code.",
        reason: "expired",
      };
    }

    // 3. Check attempt limit
    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      activeOtp.usedAt = new Date(); // Invalidate on too many attempts
      await activeOtp.save();
      return {
        success: false,
        message: "Too many incorrect attempts. This code has been invalidated.",
        reason: "max_attempts_exceeded",
        remainingAttempts: 0,
      };
    }

    // 4. Verify code hash
    const expectedHash = this.hashCode(cleanCode, activeOtp.salt);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(activeOtp.codeHash, "hex")
    );

    if (!isMatch) {
      activeOtp.attempts += 1;
      await activeOtp.save();
      const remaining = activeOtp.maxAttempts - activeOtp.attempts;

      return {
        success: false,
        message:
          remaining > 0
            ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Too many incorrect attempts. Please request a new code.",
        reason: "incorrect",
        remainingAttempts: remaining,
      };
    }

    // 5. Successful verification: Mark as used immediately (single-use)
    activeOtp.usedAt = new Date();
    await activeOtp.save();

    return {
      success: true,
      message: "Verification successful.",
      userId: activeOtp.userId ? activeOtp.userId.toString() : undefined,
    };
  }

  /**
   * Helper to mask email address for secure UI display (e.g. j***e@oauife.edu.ng)
   */
  public static maskEmail(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [user, domain] = parts;
    if (user.length <= 2) {
      return `${user[0]}*@${domain}`;
    }
    return `${user[0]}${"*".repeat(Math.min(user.length - 2, 4))}${user[user.length - 1]}@${domain}`;
  }
}
