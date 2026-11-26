/**
 * NOTARI 2.0 — Comprehensive Verification Test Suite
 * Tests Toast notification mechanics, OTP generation & hashing, Challenge Token cryptography,
 * and email template generation.
 */

import crypto from "crypto";
import { OtpService } from "../lib/auth/otp-service";
import { createChallengeToken, verifyChallengeToken } from "../lib/auth/challenge-token";
import { toastManager, ToastItem } from "../lib/toast";
import {
  renderRegistrationOtpEmail,
  renderLoginOtpEmail,
  renderPasswordResetOtpEmail,
} from "../lib/email/templates/auth-templates";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🧪 RUNNING NOTARI 2.0 NOTIFICATIONS & OTP SECURITY VERIFICATION");
  console.log("==================================================================\n");

  // TEST 1: Toast Notification Manager Mechanics
  console.log("📌 SUITE 1: Toast Notification System");
  let receivedToasts: ToastItem[] = [];
  const unsubscribe = toastManager.subscribe((items) => {
    receivedToasts = items;
  });

  const toastId1 = toastManager.show("success", "Profile Updated", {
    description: "Your changes have been saved.",
    duration: 3000,
  });

  assert(receivedToasts.length === 1, "Toast subscriber receives emitted toast");
  assert(receivedToasts[0].id === toastId1, "Toast ID matches created ID");
  assert(receivedToasts[0].type === "success", "Toast type is 'success'");
  assert(receivedToasts[0].title === "Profile Updated", "Toast title matches");

  // Test deduplication by ID
  toastManager.show("success", "Profile Updated (Updated)", { id: toastId1 });
  assert(receivedToasts.length === 1, "Duplicate toast ID updates in place without adding extra item");
  assert(receivedToasts[0].title === "Profile Updated (Updated)", "Toast title was updated");

  // Test dismissal
  toastManager.dismiss(toastId1);
  assert(receivedToasts.length === 0, "Toast dismissed successfully");

  // Test maximum visible toasts (capped at 5)
  for (let i = 0; i < 7; i++) {
    toastManager.show("info", `Notification ${i + 1}`);
  }
  assert(receivedToasts.length <= 5, "Toast container caps at max 5 visible notifications");

  toastManager.dismissAll();
  assert(receivedToasts.length === 0, "dismissAll clears all active toasts");
  unsubscribe();

  // TEST 2: OTP Code Generation & Formatting
  console.log("\n📌 SUITE 2: OTP Generation & Cryptographic Hashing");
  const codes = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const code = OtpService.generateSecureCode();
    codes.add(code);
    if (!/^\d{6}$/.test(code)) {
      assert(false, "OTP format", `Generated invalid code format: ${code}`);
    }
  }
  assert(codes.size === 50, "Generated 50 unique, random 6-digit OTP codes");

  // Test hashing and salt verification
  const testCode = "481920";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash1 = OtpService.hashCode(testCode, salt);
  const hash2 = OtpService.hashCode(testCode, salt);
  const wrongHash = OtpService.hashCode("999999", salt);

  assert(hash1 === hash2, "Identical code and salt produce identical SHA-256 hash");
  assert(hash1 !== wrongHash, "Different code produces different hash");
  assert(hash1.length === 64, "Hash is standard 64-character hex SHA-256 string");

  // TEST 3: Email Masking Utility
  console.log("\n📌 SUITE 3: Email Masking Utility");
  assert(
    OtpService.maskEmail("nathanaeloba1@gmail.com") === "n****1@gmail.com",
    "Email masking masks username properly"
  );
  assert(
    OtpService.maskEmail("student@oau.edu.ng") === "s****t@oau.edu.ng",
    "Email masking formats academic addresses securely"
  );
  assert(
    OtpService.maskEmail("ab@test.com") === "a*@test.com",
    "Short 2-char email prefix handled cleanly"
  );

  // TEST 4: HMAC Challenge Token Generation & Validation
  console.log("\n📌 SUITE 4: Two-Factor HMAC Challenge Token Security");
  const testUserId = "654321abcdef0123456789ab";
  const testEmail = "student@notari.oau.edu.ng";

  const challengeToken = createChallengeToken(testUserId, testEmail);
  assert(typeof challengeToken === "string" && challengeToken.length > 30, "Challenge token generated");

  const validation = verifyChallengeToken(challengeToken);
  assert(validation.valid === true, "Valid challenge token successfully verified");
  assert(validation.userId === testUserId, "Extracted userId matches payload");
  assert(validation.email === testEmail, "Extracted email matches payload");

  // Test tampered token signature
  const tamperedToken = challengeToken.replace(/.$/, "0");
  const tamperedCheck = verifyChallengeToken(tamperedToken);
  assert(tamperedCheck.valid === false, "Tampered signature is rejected by timing-safe verification");

  // Test malformed token
  const malformedCheck = verifyChallengeToken("invalid:token");
  assert(malformedCheck.valid === false, "Malformed token rejected");

  // TEST 5: Branded Transactional Email Templates
  console.log("\n📌 SUITE 5: Transactional Email Templates");
  const regEmail = renderRegistrationOtpEmail({
    name: "Adeola",
    email: "adeola@oau.edu.ng",
    otpCode: "381940",
  });
  assert(regEmail.subject.includes("381940"), "Registration email subject includes OTP code");
  assert(regEmail.html.includes("381940"), "Registration HTML body includes prominent OTP code");
  assert(regEmail.html.includes("NOTARI"), "Registration HTML includes NOTARI brand header");
  assert(regEmail.text.includes("381940"), "Registration plain text version includes OTP code");

  const loginEmail = renderLoginOtpEmail({
    name: "Adeola",
    email: "adeola@oau.edu.ng",
    otpCode: "710294",
    ipAddress: "197.210.55.10",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  });
  assert(loginEmail.subject.includes("710294"), "Login email subject includes OTP code");
  assert(loginEmail.html.includes("197.210.55.10"), "Login email includes requesting IP address context");
  assert(loginEmail.text.includes("710294"), "Login plain text version includes OTP code");

  const resetEmail = renderPasswordResetOtpEmail({
    name: "Adeola",
    email: "adeola@oau.edu.ng",
    otpCode: "951302",
  });
  assert(
    resetEmail.subject.toLowerCase().includes("password reset"),
    "Password reset email subject is accurate"
  );
  assert(resetEmail.html.includes("951302"), "Password reset HTML includes OTP code");

  console.log("\n==================================================================");
  console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
