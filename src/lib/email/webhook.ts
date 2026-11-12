import crypto from "crypto";

export interface VerifyWebhookParams {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  secret: string;
  toleranceSeconds?: number;
}

/**
 * Verifies a Resend / Svix standard webhook signature using HMAC-SHA256.
 * Protects against tampering and replay attacks.
 */
export function verifyResendWebhookSignature({
  payload,
  svixId,
  svixTimestamp,
  svixSignature,
  secret,
  toleranceSeconds = 300, // 5 minutes tolerance
}: VerifyWebhookParams): boolean {
  if (!payload || !svixId || !svixTimestamp || !svixSignature || !secret) {
    return false;
  }

  // 1. Verify timestamp to prevent replay attacks
  const timestampSec = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSec)) {
    return false;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > toleranceSeconds) {
    return false;
  }

  // 2. Decode the secret key
  let secretKey: Buffer;
  const cleanSecret = secret.trim();
  if (cleanSecret.startsWith("whsec_")) {
    const base64Key = cleanSecret.slice("whsec_".length);
    secretKey = Buffer.from(base64Key, "base64");
  } else {
    secretKey = Buffer.from(cleanSecret, "utf-8");
  }

  // 3. Reconstruct signed content: "${svix_id}.${svix_timestamp}.${payload}"
  const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;
  const computedHmac = crypto
    .createHmac("sha256", secretKey)
    .update(signedPayload, "utf-8")
    .digest();
  const computedBase64 = computedHmac.toString("base64");

  // 4. Extract signatures from header (can be multiple space-separated: "v1,sig1 v1,sig2")
  const signatures = svixSignature
    .split(" ")
    .map((part) => {
      const commaIdx = part.indexOf(",");
      if (commaIdx !== -1) {
        return part.slice(commaIdx + 1);
      }
      return part;
    })
    .filter(Boolean);

  const computedBuf = Buffer.from(computedBase64, "utf-8");

  for (const sig of signatures) {
    const sigBuf = Buffer.from(sig, "utf-8");
    if (computedBuf.length === sigBuf.length && crypto.timingSafeEqual(computedBuf, sigBuf)) {
      return true;
    }
  }

  return false;
}
