import crypto from "crypto";

const CHALLENGE_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a cryptographically signed HMAC challenge token for 2-step OTP login.
 * Token format: userId:email:timestamp:signature
 */
export function createChallengeToken(userId: string, email: string): string {
  const secret = process.env.AUTH_SECRET || "scaffold_auth_secret_minimum_32_characters";
  const timestamp = Date.now();
  const payload = `${userId}:${email.toLowerCase().trim()}:${timestamp}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export interface VerifyChallengeTokenResult {
  valid: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

/**
 * Validates the structure, timestamp freshness (10m TTL), and HMAC signature of a challenge token.
 */
export function verifyChallengeToken(token: string): VerifyChallengeTokenResult {
  try {
    const secret = process.env.AUTH_SECRET || "scaffold_auth_secret_minimum_32_characters";
    const parts = token.split(":");
    if (parts.length !== 4) {
      return { valid: false, error: "Malformed challenge token structure" };
    }

    const [userId, email, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return { valid: false, error: "Invalid timestamp in challenge token" };
    }

    // Verify token age (max 10 minutes)
    if (Date.now() - timestamp > CHALLENGE_TOKEN_EXPIRY_MS) {
      return { valid: false, error: "Challenge token has expired" };
    }

    const payload = `${userId}:${email}:${timestampStr}`;
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    );

    if (!isMatch) {
      return { valid: false, error: "Invalid challenge token signature" };
    }

    return { valid: true, userId, email };
  } catch {
    return { valid: false, error: "Token verification failed" };
  }
}
