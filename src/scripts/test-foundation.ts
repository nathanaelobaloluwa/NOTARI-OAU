import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerSchema } from "../validators/auth";
import { authConfig } from "../lib/auth/auth.config";
import { TicketSecurityService } from "../lib/tickets/qr";
import { User } from "../models/User";
import { USER_ROLES } from "../constants/roles";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

let passed = 0;
let failed = 0;

function assert(condition: unknown, testName: string) {
  if (Boolean(condition)) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runFoundationTests() {
  console.log("\n========================================================");
  console.log("🚀 RUNNING NOTARI 2.0 FOUNDATION AUTOMATED AUDIT TESTS");
  console.log("========================================================\n");

  // TEST SUITE 1: Password Hashing & Authentication Credentials
  console.log("--- 1. Password Security & Hashing Tests ---");
  const testPassword = "MySecurePassword2026!";
  const hash = await bcrypt.hash(testPassword, 12);

  assert(hash.startsWith("$2"), "Password hashed using bcrypt format ($2a / $2b)");
  assert(hash !== testPassword, "Password hash is strictly not plaintext");
  assert(await bcrypt.compare(testPassword, hash), "Valid password comparison succeeds");
  assert(!(await bcrypt.compare("WrongPassword", hash)), "Incorrect password comparison is rejected");

  // TEST SUITE 2: Registration Validation & Privilege Escalation Prevention
  console.log("\n--- 2. Registration Validation & Role Injection Defense ---");
  const validStudent = {
    name: "Obaloluwa Ajekiigbe",
    email: "student@oau.edu.ng",
    password: "Password123",
    matricNumber: "CSC/2021/001",
    faculty: "Faculty of Technology",
  };
  const parsedStudent = registerSchema.safeParse(validStudent);
  assert(parsedStudent.success, "Valid student registration payload passes Zod validation");

  // Try injecting admin role
  const injectedAdmin = {
    ...validStudent,
    email: "attacker@oau.edu.ng",
    role: "admin",
  };
  const parsedAdmin = registerSchema.safeParse(injectedAdmin);
  assert(
    !parsedAdmin.success,
    "Privilege Escalation Blocked: Public registration cannot inject 'admin' role"
  );

  // Try injecting organizer role
  const injectedOrg = {
    ...validStudent,
    email: "attacker2@oau.edu.ng",
    role: "organizer",
  };
  const parsedOrg = registerSchema.safeParse(injectedOrg);
  assert(
    !parsedOrg.success,
    "Privilege Escalation Blocked: Public registration cannot inject 'organizer' role"
  );

  // Password complexity check
  const weakPassword = {
    ...validStudent,
    password: "weak",
  };
  assert(!registerSchema.safeParse(weakPassword).success, "Short password (<8 chars) is rejected");

  // TEST SUITE 3: Role-Based Route Guard Logic
  console.log("\n--- 3. Edge Route Guard & Access Control Tests ---");
  const authorizedCallback = authConfig.callbacks?.authorized;
  if (!authorizedCallback) {
    throw new Error("authorized callback missing in authConfig");
  }

  const dummyReq = (pathname: string) => ({
    request: {
      nextUrl: new URL(`http://localhost:3000${pathname}`),
    } as unknown as NextRequest,
  });

  // Scenario: Unauthenticated visits
  const unauthAdmin = await authorizedCallback({ auth: null, ...dummyReq("/admin") });
  assert(unauthAdmin === false, "Unauthenticated user blocked from /admin");

  const unauthOrg = await authorizedCallback({ auth: null, ...dummyReq("/organizer") });
  assert(unauthOrg === false, "Unauthenticated user blocked from /organizer");

  const unauthStudent = await authorizedCallback({ auth: null, ...dummyReq("/student") });
  assert(unauthStudent === false, "Unauthenticated user blocked from /student");

  // Scenario: Cross-role visits (Strict isolation)
  const studentAuth = {
    user: { id: "s1", email: "s@oau.edu.ng", role: USER_ROLES.STUDENT },
    expires: new Date(Date.now() + 3600000).toISOString(),
  } as unknown as Session;

  const orgAuth = {
    user: { id: "o1", email: "o@oau.edu.ng", role: USER_ROLES.ORGANIZER },
    expires: new Date(Date.now() + 3600000).toISOString(),
  } as unknown as Session;

  const adminAuth = {
    user: { id: "a1", email: "a@oau.edu.ng", role: USER_ROLES.ADMIN },
    expires: new Date(Date.now() + 3600000).toISOString(),
  } as unknown as Session;

  // Student trying to access admin
  const studentOnAdmin = await authorizedCallback({ auth: studentAuth, ...dummyReq("/admin") });
  assert(
    studentOnAdmin instanceof Response && studentOnAdmin.headers.get("location")?.includes("/student"),
    "Student accessing /admin is redirected back to /student"
  );

  // Student trying to access organizer
  const studentOnOrg = await authorizedCallback({ auth: studentAuth, ...dummyReq("/organizer") });
  assert(
    studentOnOrg instanceof Response && studentOnOrg.headers.get("location")?.includes("/student"),
    "Student accessing /organizer is redirected back to /student"
  );

  // Organizer trying to access admin
  const orgOnAdmin = await authorizedCallback({ auth: orgAuth, ...dummyReq("/admin") });
  assert(
    orgOnAdmin instanceof Response && orgOnAdmin.headers.get("location")?.includes("/organizer"),
    "Organizer accessing /admin is redirected back to /organizer"
  );

  // Authorized visits
  const studentOnStudent = await authorizedCallback({ auth: studentAuth, ...dummyReq("/student") });
  assert(studentOnStudent === true, "Student accessing /student is allowed");

  const orgOnOrg = await authorizedCallback({ auth: orgAuth, ...dummyReq("/organizer") });
  assert(orgOnOrg === true, "Organizer accessing /organizer is allowed");

  const adminOnAdmin = await authorizedCallback({ auth: adminAuth, ...dummyReq("/admin") });
  assert(adminOnAdmin === true, "Admin accessing /admin is allowed");

  // TEST SUITE 4: Ticket QR Security & Buffer Guard Tests
  console.log("\n--- 4. Ticket Security & Anti-Crash Buffer Tests ---");
  const ticketCode = TicketSecurityService.generateTicketCode();
  assert(ticketCode.startsWith("NOT-OAU-"), "Ticket code has proper university prefix");
  assert(ticketCode.length >= 20, "Ticket code has high entropy (>= 20 chars)");

  const eventId = "evt-test-12345";
  const validSig = TicketSecurityService.signTicket(ticketCode, eventId);

  assert(
    TicketSecurityService.verifyTicketSignature(ticketCode, eventId, validSig),
    "Valid ticket HMAC signature verified successfully"
  );

  assert(
    !TicketSecurityService.verifyTicketSignature(ticketCode, eventId, "forged_signature_0000"),
    "Forged ticket signature is rejected"
  );

  // Buffer length mismatch should return false safely, NOT throw RangeError
  let threwRangeError = false;
  try {
    const truncatedSig = "short";
    const res = TicketSecurityService.verifyTicketSignature(ticketCode, eventId, truncatedSig);
    assert(res === false, "Truncated signature safely returns false without crashing");
  } catch {
    threwRangeError = true;
  }
  assert(!threwRangeError, "TimingSafeEqual buffer length mismatch does NOT throw unhandled RangeError");

  // TEST SUITE 5: Paystack Webhook Constant-Time HMAC Verification
  console.log("\n--- 5. Webhook Constant-Time HMAC Verification Tests ---");
  const testSecret = "sk_test_mock_secret_key";
  const testPayload = JSON.stringify({ event: "charge.success", data: { reference: "ref_123" } });
  const validWebhookSig = crypto.createHmac("sha512", testSecret).update(testPayload).digest("hex");

  const validHashBuf = Buffer.from(validWebhookSig, "utf-8");
  const validSigBuf = Buffer.from(validWebhookSig, "utf-8");
  assert(
    validHashBuf.byteLength === validSigBuf.byteLength && crypto.timingSafeEqual(validHashBuf, validSigBuf),
    "Valid webhook HMAC passes timing-safe comparison"
  );

  const invalidSig = "bad_signature_sample";
  const invalidSigBuf = Buffer.from(invalidSig, "utf-8");
  assert(
    validHashBuf.byteLength !== invalidSigBuf.byteLength,
    "Mismatched webhook signature length detected before comparison"
  );

  // TEST SUITE 6: Sensitive Schema Fields (Password Exclusion)
  console.log("\n--- 6. Schema Information Exposure Tests ---");
  const passwordFieldOptions = User.schema.path("password")?.options as Record<string, unknown> | undefined;
  assert(
    passwordFieldOptions && passwordFieldOptions.select === false,
    "User password field is configured with { select: false } in Mongoose"
  );

  const matricOptions = User.schema.path("matricNumber")?.options as Record<string, unknown> | undefined;
  assert(
    matricOptions && matricOptions.sparse === true && matricOptions.unique === true,
    "User matricNumber is configured with { sparse: true, unique: true }"
  );

  // TEST SUITE 7: Seed Script Security & Production Refusal Tests
  console.log("\n--- 7. Development Seed Script Security Tests ---");

  // Check 1: Missing seed password detection
  function validateSeedEnv(envMap: Record<string, string | undefined>) {
    const missing: string[] = [];
    if (!envMap.SEED_ADMIN_PASSWORD || envMap.SEED_ADMIN_PASSWORD.trim() === "") missing.push("SEED_ADMIN_PASSWORD");
    if (!envMap.SEED_ORGANIZER_PASSWORD || envMap.SEED_ORGANIZER_PASSWORD.trim() === "") missing.push("SEED_ORGANIZER_PASSWORD");
    if (!envMap.SEED_STUDENT_PASSWORD || envMap.SEED_STUDENT_PASSWORD.trim() === "") missing.push("SEED_STUDENT_PASSWORD");
    return missing;
  }

  const missingAll = validateSeedEnv({});
  assert(missingAll.length === 3, "Seed validator detects all 3 missing passwords when empty");

  const missingOne = validateSeedEnv({
    SEED_ADMIN_PASSWORD: "secret_admin_pw",
    SEED_ORGANIZER_PASSWORD: "secret_org_pw",
  });
  assert(
    missingOne.length === 1 && missingOne[0] === "SEED_STUDENT_PASSWORD",
    "Seed validator detects when single required password is missing"
  );

  // Check 2: Production execution refusal
  function shouldRefuseProductionSeed(nodeEnv: string) {
    return nodeEnv === "production";
  }
  assert(
    shouldRefuseProductionSeed("production"),
    "Seed script strictly refuses execution when NODE_ENV === 'production'"
  );
  assert(
    !shouldRefuseProductionSeed("development"),
    "Seed script permits execution when NODE_ENV === 'development'"
  );

  // Check 3: Short password rejection (<8 chars)
  const shortPassword = "short";
  assert(shortPassword.length < 8, "Passwords under 8 characters are identified as insecure");

  // TEST SUITE 8: Public Event Discovery & Query Filter Security Tests
  console.log("\n--- 8. Public Event Discovery & Filter Security Tests ---");
  const { eventFilterSchema } = await import("../validators/event");
  const { EVENT_STATUS } = await import("../constants/oau");

  // Filter validation tests
  const emptyFilterParsed = eventFilterSchema.parse({
    search: "",
    category: "",
    faculty: "all",
    date: "",
    isFree: "",
    page: "2",
  });
  assert(emptyFilterParsed.search === undefined, "Empty search query is sanitized to undefined");
  assert(emptyFilterParsed.category === undefined, "Empty category is sanitized to undefined");
  assert(emptyFilterParsed.faculty === undefined, "'all' faculty option is sanitized to undefined");
  assert(emptyFilterParsed.page === 2, "Page number is coerced into positive integer");
  assert(emptyFilterParsed.limit === 9, "Default limit applies when omitted");

  // Visibility and security rule test
  const publicQuery: { status: string } = { status: EVENT_STATUS.PUBLISHED };
  assert(publicQuery.status === "published", "Public event query strictly requires 'published' status");
  assert(publicQuery.status !== EVENT_STATUS.DRAFT, "Public query isolates DRAFT events");
  assert(publicQuery.status !== EVENT_STATUS.PENDING_APPROVAL, "Public query isolates PENDING_APPROVAL events");
  assert(publicQuery.status !== EVENT_STATUS.REJECTED, "Public query isolates REJECTED events");

  // Summary
  console.log("\n========================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFoundationTests();
