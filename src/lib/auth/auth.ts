import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { OtpService } from "@/lib/auth/otp-service";
import { verifyChallengeToken } from "@/lib/auth/challenge-token";

function parseDevice(userAgent: string): string {
  if (!userAgent || userAgent === "unknown") return "Web Browser";
  if (/mobile|android|iphone|ipad/i.test(userAgent)) {
    if (/iphone/i.test(userAgent)) return "iPhone (Mobile)";
    if (/ipad/i.test(userAgent)) return "iPad (Tablet)";
    if (/android/i.test(userAgent)) return "Android Device";
    return "Mobile Browser";
  }
  if (/macintosh|mac os x/i.test(userAgent)) return "Mac (Desktop)";
  if (/windows/i.test(userAgent)) return "Windows (Desktop)";
  if (/linux/i.test(userAgent)) return "Linux (Desktop)";
  return "Desktop Browser";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        challengeToken: { label: "Challenge Token", type: "text" },
        otpCode: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;

        const email = String(credentials.email || "").toLowerCase().trim();
        const otpCode = credentials.otpCode ? String(credentials.otpCode).trim() : undefined;
        const challengeToken = credentials.challengeToken
          ? String(credentials.challengeToken).trim()
          : undefined;
        const password = credentials.password ? String(credentials.password) : undefined;

        try {
          await connectToDatabase();

          // 1. Two-Factor Authentication via OTP code + challengeToken
          if (challengeToken && otpCode) {
            const tokenCheck = verifyChallengeToken(challengeToken);
            if (!tokenCheck.valid || !tokenCheck.email) {
              console.warn("🔒 Challenge token invalid or expired during authorize.");
              return null;
            }

            const targetEmail = tokenCheck.email.toLowerCase().trim();
            if (email && email !== targetEmail) {
              console.warn("🔒 Email mismatch between challenge token and credentials.");
              return null;
            }

            // Verify 6-digit OTP code with cryptographic timing-safe checks
            const otpResult = await OtpService.verifyOtp({
              email: targetEmail,
              code: otpCode,
              purpose: "login",
            });

            if (!otpResult.success) {
              console.warn(`🔒 OTP verification failed for ${targetEmail}: ${otpResult.message}`);
              return null;
            }

            const user = await User.findOne({ email: targetEmail });
            if (!user || user.status === "suspended") {
              return null;
            }

            // Record login activity
            const userAgent = (req as { headers?: { get?: (k: string) => string | null } })?.headers?.get?.("user-agent") || "unknown";
            const ipAddress =
              (req as { headers?: { get?: (k: string) => string | null } })?.headers
                ?.get?.("x-forwarded-for")
                ?.split(",")[0]
                ?.trim() || "unknown";
            const device = parseDevice(userAgent);

            user.lastLoginAt = new Date();
            user.recentLogins = user.recentLogins || [];
            user.recentLogins.unshift({
              timestamp: new Date(),
              ipAddress,
              userAgent: userAgent.slice(0, 200),
              device,
            });
            user.recentLogins = user.recentLogins.slice(0, 10);
            await user.save();

            const rawImg = user.image || user.profilePhotoUrl;
            const servedImage =
              rawImg && !rawImg.startsWith("data:")
                ? rawImg
                : rawImg
                  ? `/api/user/profile-photo?userId=${user._id.toString()}`
                  : undefined;

            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              isOrganizer: Boolean(user.isOrganizer || user.role === "organizer"),
              image: servedImage,
            };
          }

          // 2. Direct password authentication fallback (for testing/scripts)
          if (email && password) {
            const user = await User.findOne({ email }).select("+password");
            if (!user || !user.password || user.status === "suspended") {
              return null;
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
              return null;
            }

            // Record login activity
            const userAgent = (req as { headers?: { get?: (k: string) => string | null } })?.headers?.get?.("user-agent") || "unknown";
            const ipAddress =
              (req as { headers?: { get?: (k: string) => string | null } })?.headers
                ?.get?.("x-forwarded-for")
                ?.split(",")[0]
                ?.trim() || "unknown";
            const device = parseDevice(userAgent);

            user.lastLoginAt = new Date();
            user.recentLogins = user.recentLogins || [];
            user.recentLogins.unshift({
              timestamp: new Date(),
              ipAddress,
              userAgent: userAgent.slice(0, 200),
              device,
            });
            user.recentLogins = user.recentLogins.slice(0, 10);
            await user.save();

            const rawImg = user.image || user.profilePhotoUrl;
            const servedImage =
              rawImg && !rawImg.startsWith("data:")
                ? rawImg
                : rawImg
                  ? `/api/user/profile-photo?userId=${user._id.toString()}`
                  : undefined;

            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              isOrganizer: Boolean(user.isOrganizer || user.role === "organizer"),
              image: servedImage,
            };
          }

          return null;
        } catch (error) {
          console.error("❌ Authentication authorization error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "scaffold_auth_secret_minimum_32_characters",
});
