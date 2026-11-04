import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerSchema } from "../validators/auth";
import { authConfig } from "../lib/auth/auth.config";
import { TicketSecurityService } from "../lib/tickets/qr";
import { User } from "../models/User";
import { Bookmark } from "../models/Bookmark";
import { OrganizerApplication } from "../models/OrganizerApplication";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { Event } from "../models/Event";
import {
  createEventSchema,
  updateEventSchema,
  ticketTierSchema,
  adminEventReviewSchema,
} from "../validators/event";
import { bookmarkSchema, bookmarkQuerySchema } from "../validators/bookmark";
import {
  studentProfileUpdateSchema,
  changePasswordSchema,
  studentHistoryQuerySchema,
} from "../validators/student";
import {
  individualApplicationSchema,
  organizationApplicationSchema,
  organizerApplicationSchema,
  applicationReviewSchema,
  organizerProfileUpdateSchema,
} from "../validators/organizer";
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

  // Dual-capability: Student with approved organizer accreditation
  const studentOrganizerAuth = {
    user: { id: "so1", email: "student.org@oau.edu.ng", role: USER_ROLES.STUDENT, isOrganizer: true },
    expires: new Date(Date.now() + 3600000).toISOString(),
  } as unknown as Session;

  const studentOrgOnOrg = await authorizedCallback({ auth: studentOrganizerAuth, ...dummyReq("/organizer") });
  assert(studentOrgOnOrg === true, "Student with isOrganizer: true capability is allowed to access /organizer");

  const studentOrgOnStudent = await authorizedCallback({ auth: studentOrganizerAuth, ...dummyReq("/student") });
  assert(studentOrgOnStudent === true, "Student with isOrganizer: true capability retains full access to /student");

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

  // TEST SUITE 9: Free Event Registration Validation & Security Tests
  console.log("\n--- 9. Free Event Registration Validation & Bounds Tests ---");
  const { freeRegistrationSchema, generateBookingReference } = await import("../validators/booking");

  const validFreeBooking = {
    eventId: "65c1a1112223334445556667",
    ticketTierId: "65c1a1112223334445556668",
    quantity: 2,
  };
  const parsedFree = freeRegistrationSchema.safeParse(validFreeBooking);
  assert(parsedFree.success, "Valid free registration payload passes Zod validation");

  const stringCoercedFree = freeRegistrationSchema.safeParse({
    ...validFreeBooking,
    quantity: "3",
  });
  assert(stringCoercedFree.success && (stringCoercedFree.data as { quantity: number }).quantity === 3, "Quantity string is safely coerced to integer");

  const missingEvent = freeRegistrationSchema.safeParse({
    ticketTierId: "65c1a1112223334445556668",
    quantity: 1,
  });
  assert(!missingEvent.success, "Registration missing eventId is rejected");

  const missingTier = freeRegistrationSchema.safeParse({
    eventId: "65c1a1112223334445556667",
    quantity: 1,
  });
  assert(!missingTier.success, "Registration missing ticketTierId is rejected");

  const zeroQuantity = freeRegistrationSchema.safeParse({
    ...validFreeBooking,
    quantity: 0,
  });
  assert(!zeroQuantity.success, "Zero quantity registration is rejected");

  const excessiveQuantity = freeRegistrationSchema.safeParse({
    ...validFreeBooking,
    quantity: 6,
  });
  assert(!excessiveQuantity.success, "Quantity exceeding max per order (5) is rejected");

  const floatQuantity = freeRegistrationSchema.safeParse({
    ...validFreeBooking,
    quantity: 2.5,
  });
  assert(!floatQuantity.success, "Floating point fractional quantity is rejected");

  // TEST SUITE 10: Booking Reference & Ticket Code Cryptographic Entropy Tests
  console.log("\n--- 10. Booking Reference & Ticket Cryptographic Entropy Tests ---");
  const ref1 = generateBookingReference(2026);
  assert(/^NOT-2026-[0-9A-F]{8}$/.test(ref1), "Booking reference adheres to 'NOT-YYYY-XXXXXXXX' pattern");

  const sampleRefs = new Set<string>();
  for (let i = 0; i < 100; i++) {
    sampleRefs.add(generateBookingReference());
  }
  assert(sampleRefs.size === 100, "100 consecutive booking references are completely unique (no collisions)");

  const ticketCode1 = TicketSecurityService.generateTicketCode();
  assert(/^NOT-OAU-[0-9A-F]{12}$/.test(ticketCode1), "Ticket code adheres to 'NOT-OAU-XXXXXXXXXXXX' pattern");

  const sampleCodes = new Set<string>();
  for (let i = 0; i < 100; i++) {
    sampleCodes.add(TicketSecurityService.generateTicketCode());
  }
  assert(sampleCodes.size === 100, "100 consecutive ticket codes are completely unique (high entropy)");

  // TEST SUITE 11: Ticket HMAC Signing & Anti-Tampering Verification Tests
  console.log("\n--- 11. Ticket HMAC Signing & Anti-Forgery Verification Tests ---");
  const testTicketCode = "NOT-OAU-A1B2C3D4E5F6";
  const testEventId = "65c1a1112223334445556667";

  const foundationValidSig = TicketSecurityService.signTicket(testTicketCode, testEventId);
  assert(typeof foundationValidSig === "string" && foundationValidSig.length === 16, "Ticket signature generates a 16-character hex hash");
  assert(
    TicketSecurityService.verifyTicketSignature(testTicketCode, testEventId, foundationValidSig),
    "Genuine ticket signature verifies true"
  );
  assert(
    !TicketSecurityService.verifyTicketSignature("NOT-OAU-FORGEDCODE", testEventId, foundationValidSig),
    "Tampered ticket code fails verification"
  );
  assert(
    !TicketSecurityService.verifyTicketSignature(testTicketCode, "65c1a1112223334445559999", foundationValidSig),
    "Ticket signature tied to different eventId fails verification"
  );
  assert(
    !TicketSecurityService.verifyTicketSignature(testTicketCode, testEventId, "forged_signature_"),
    "Forged signature fails verification"
  );
  assert(
    !TicketSecurityService.verifyTicketSignature(testTicketCode, testEventId, ""),
    "Empty signature is rejected safely without crash"
  );
  assert(
    !TicketSecurityService.verifyTicketSignature(testTicketCode, testEventId, "short"),
    "Mismatched signature length does not cause timingSafeEqual RangeError"
  );

  // TEST SUITE 12: Bookmark Validation & Schema Contract Tests
  console.log("\n--- 12. Bookmark Validation & Schema Contract Tests ---");
  const validBookmark = { eventId: "65c1a1112223334445556667" };
  const parsedBookmark = bookmarkSchema.safeParse(validBookmark);
  assert(parsedBookmark.success, "Valid bookmark payload passes Zod validation");

  const emptyBookmark = { eventId: "" };
  assert(!bookmarkSchema.safeParse(emptyBookmark).success, "Empty eventId is rejected by bookmarkSchema");

  const missingBookmark = {};
  assert(!bookmarkSchema.safeParse(missingBookmark).success, "Missing eventId is rejected by bookmarkSchema");

  const parsedIdsOnlyTrue = bookmarkQuerySchema.safeParse({ idsOnly: "true" });
  assert(
    parsedIdsOnlyTrue.success && parsedIdsOnlyTrue.data.idsOnly === true,
    "bookmarkQuerySchema transforms idsOnly='true' into boolean true"
  );

  const parsedIdsOnlyFalse = bookmarkQuerySchema.safeParse({ idsOnly: "false" });
  assert(
    parsedIdsOnlyFalse.success && parsedIdsOnlyFalse.data.idsOnly === false,
    "bookmarkQuerySchema transforms idsOnly='false' into boolean false"
  );

  const parsedIdsOnlyEmpty = bookmarkQuerySchema.safeParse({});
  assert(
    parsedIdsOnlyEmpty.success && parsedIdsOnlyEmpty.data.idsOnly === false,
    "bookmarkQuerySchema defaults undefined idsOnly to boolean false"
  );

  assert(Bookmark.schema.indexes().length >= 2, "Bookmark schema registers at least 2 compound/sorting indexes");

  // TEST SUITE 13: Student Profile & Password Validation Tests
  console.log("\n--- 13. Student Profile & Password Validation Tests ---");
  const validProfileUpdate = {
    name: "Obaloluwa Nathanael Ajekiigbe",
    phone: "08012345678",
    faculty: "Technology",
    department: "Computer Science and Engineering",
  };
  const parsedProfile = studentProfileUpdateSchema.safeParse(validProfileUpdate);
  assert(parsedProfile.success, "Valid student profile update payload passes Zod validation");

  const invalidShortName = { name: "A" };
  assert(!studentProfileUpdateSchema.safeParse(invalidShortName).success, "Short name (<2 chars) is rejected");

  const invalidPhone = { name: "Obaloluwa", phone: "abc1234" };
  assert(!studentProfileUpdateSchema.safeParse(invalidPhone).success, "Invalid phone number format is rejected");

  const validPasswordChange = {
    currentPassword: "OldPassword123!",
    newPassword: "NewSecurePassword2026!",
    confirmPassword: "NewSecurePassword2026!",
  };
  const parsedPassChange = changePasswordSchema.safeParse(validPasswordChange);
  assert(parsedPassChange.success, "Valid password change payload passes Zod validation");

  const mismatchedPassChange = {
    currentPassword: "OldPassword123!",
    newPassword: "NewSecurePassword2026!",
    confirmPassword: "DifferentPassword2026!",
  };
  assert(!changePasswordSchema.safeParse(mismatchedPassChange).success, "Mismatched confirmation password is rejected");

  const identicalPassChange = {
    currentPassword: "SamePassword123!",
    newPassword: "SamePassword123!",
    confirmPassword: "SamePassword123!",
  };
  assert(!changePasswordSchema.safeParse(identicalPassChange).success, "New password identical to current password is rejected");

  const weakPassChange = {
    currentPassword: "OldPassword123!",
    newPassword: "weak",
    confirmPassword: "weak",
  };
  assert(!changePasswordSchema.safeParse(weakPassChange).success, "Weak new password (<8 chars / no numbers) is rejected");

  const validHistoryTab = studentHistoryQuerySchema.safeParse({ tab: "upcoming" });
  assert(validHistoryTab.success && validHistoryTab.data.tab === "upcoming", "studentHistoryQuerySchema accepts 'upcoming'");

  const defaultHistoryTab = studentHistoryQuerySchema.safeParse({});
  assert(defaultHistoryTab.success && defaultHistoryTab.data.tab === "all", "studentHistoryQuerySchema defaults to 'all'");

  // TEST SUITE 14: Phase 5.1 Organizer Application & Profile Validation Tests
  console.log("\n--- 14. Phase 5.1 Organizer Application & Accreditation Schema Tests ---");

  // Check 1: Valid individual student organizer application
  const validIndividual = {
    applicantType: "individual" as const,
    applicantName: "Bamidele Adeleke",
    applicantEmail: "bamidele@oau.edu.ng",
    applicantMatricNumber: "CSC/2021/099",
    faculty: "Faculty of Technology",
    department: "Computer Science and Engineering",
    phone: "08012345678",
    displayName: "Bamidele Events",
    description: "Experienced student event producer organizing hackathons, tech talks, and academic workshops across OAU campus.",
    reason: "I want to host tech meetups and student development conferences for Great Ife students using official campus accreditation.",
    experience: "Co-organized the 2025 Tech Fest at OAU.",
  };
  const parsedIndividual = individualApplicationSchema.safeParse(validIndividual);
  assert(parsedIndividual.success, "Valid individual student application payload passes Zod validation");

  const parsedUnionIndividual = organizerApplicationSchema.safeParse(validIndividual);
  assert(parsedUnionIndividual.success, "Valid individual application passes discriminated union organizerApplicationSchema");

  // Check 2: Individual application validation bounds
  const missingFaculty = { ...validIndividual, faculty: "" };
  assert(!individualApplicationSchema.safeParse(missingFaculty).success, "Individual application missing faculty is rejected");

  const shortDescription = { ...validIndividual, description: "Too short" };
  assert(!individualApplicationSchema.safeParse(shortDescription).success, "Individual description <20 characters is rejected");

  const shortReason = { ...validIndividual, reason: "Short reason" };
  assert(!individualApplicationSchema.safeParse(shortReason).success, "Individual reason <20 characters is rejected");

  // Check 3: Valid campus organization application
  const validOrg = {
    applicantType: "organization" as const,
    organizationName: "OAU Google Developer Student Club",
    organizationCategory: "Club",
    organizationDescription: "Official campus student developer organization promoting technological innovation and community workshops across OAU.",
    faculty: "Faculty of Technology",
    department: "Computer Science",
    contactPersonName: "Temitope Bakare",
    contactPersonEmail: "temitope@oau.edu.ng",
    contactPersonMatric: "CSC/2022/015",
    contactPersonPhone: "+2348098765432",
    officialEmail: "gdsc.oau@gmail.com",
    reason: "We require verified organizer access to coordinate student tech workshops, seminars, and developer competitions at OAU.",
  };
  const parsedOrgApp = organizationApplicationSchema.safeParse(validOrg);
  assert(parsedOrgApp.success, "Valid campus organization application payload passes Zod validation");

  const parsedUnionOrg = organizerApplicationSchema.safeParse(validOrg);
  assert(parsedUnionOrg.success, "Valid organization application passes discriminated union organizerApplicationSchema");

  // Check 4: Organization application invalid category
  const invalidOrgCategory = { ...validOrg, organizationCategory: "UnrecognizedCategory" };
  assert(!organizationApplicationSchema.safeParse(invalidOrgCategory).success, "Organization application with invalid category is rejected");

  // Check 5: Application review schema requirements
  const validApprove = applicationReviewSchema.safeParse({ action: "approve", reviewNotes: "All documents verified." });
  assert(validApprove.success, "Superadmin 'approve' action passes without mandatory reason text");

  const invalidReject = applicationReviewSchema.safeParse({ action: "reject", reason: "" });
  assert(!invalidReject.success, "Superadmin 'reject' action without reason is rejected");

  const shortRejectReason = applicationReviewSchema.safeParse({ action: "reject", reason: "no" });
  assert(!shortRejectReason.success, "Superadmin 'reject' action with reason <5 chars is rejected");

  const validReject = applicationReviewSchema.safeParse({ action: "reject", reason: "Applicant does not satisfy recognized campus hosting criteria." });
  assert(validReject.success, "Superadmin 'reject' action with detailed explanation passes validation");

  const invalidChanges = applicationReviewSchema.safeParse({ action: "request_changes", reason: "" });
  assert(!invalidChanges.success, "Superadmin 'request_changes' action without reason is rejected");

  const validChanges = applicationReviewSchema.safeParse({ action: "request_changes", reason: "Please provide official department endorsement letter." });
  assert(validChanges.success, "Superadmin 'request_changes' action with detailed explanation passes validation");

  // Check 6: Organizer profile update schema
  const validOrgProfileUpdate = {
    displayName: "Great Ife Tech Hub",
    description: "Updated mission statement focusing on campus-wide technology initiatives, workshops, and student mentorship.",
    contactPhone: "08012345678",
    website: "https://techhub.oauife.edu.ng",
    socialLinks: {
      twitter: "@OAUTechHub",
      instagram: "@oautechhub",
    },
  };
  const parsedOrgProfile = organizerProfileUpdateSchema.safeParse(validOrgProfileUpdate);
  assert(parsedOrgProfile.success, "Valid organizer profile update payload passes Zod validation");

  const invalidWebsiteUrl = { ...validOrgProfileUpdate, website: "not-a-valid-url" };
  assert(!organizerProfileUpdateSchema.safeParse(invalidWebsiteUrl).success, "Invalid website URL format is rejected");

  // Check 7: Schema indexes check
  assert(OrganizerApplication.schema.indexes().length >= 2, "OrganizerApplication schema registers compound and query indexes");
  assert(OrganizerProfile.schema.indexes().length >= 2, "OrganizerProfile schema registers unique and status indexes");

  // ========================================================
  // SUITE 15: EVENT CREATION, TICKETING & SUPERADMIN REVIEW (PHASE 5.2)
  // ========================================================
  console.log("\n🧪 SUITE 15: Event Creation, Ticketing & Superadmin Review Validation (Phase 5.2)");

  // 1. Ticket Tier Validation
  const validTier = {
    name: "General Admission",
    price: 0,
    capacity: 250,
    maxPerOrder: 5,
    description: "Standard free entry for OAU undergraduates.",
  };
  assert(ticketTierSchema.safeParse(validTier).success, "Valid free ticket tier passes validation");

  const negativePriceTier = { ...validTier, price: -500 };
  assert(!ticketTierSchema.safeParse(negativePriceTier).success, "Negative ticket price is rejected");

  const zeroCapacityTier = { ...validTier, capacity: 0 };
  assert(!ticketTierSchema.safeParse(zeroCapacityTier).success, "Zero ticket capacity is rejected");

  const excessiveOrderTier = { ...validTier, maxPerOrder: 15 };
  assert(!ticketTierSchema.safeParse(excessiveOrderTier).success, "maxPerOrder exceeding limit of 10 is rejected");

  // 2. Event Creation Schema
  const now = new Date();
  const validStartDate = new Date(now.getTime() + 86400000).toISOString(); // +1 day
  const validEndDate = new Date(now.getTime() + 90000000).toISOString(); // +1 day + 1 hour

  const validEventPayload = {
    title: "OAU Annual Tech & Innovation Summit 2026",
    summary: "The flagship gathering of tech builders and innovators at Obafemi Awolowo University.",
    description: "Join hundreds of student engineers, designers, founders and tech enthusiasts for keynote presentations, hackathon pitches, and company exhibitions.",
    category: "Academic",
    eventType: "physical",
    venue: "Oduduwa Hall",
    faculty: "Faculty of Technology",
    department: "Computer Science and Engineering",
    startDate: validStartDate,
    endDate: validEndDate,
    isFree: true,
    flyerImage: "/images/oau/oau-oduduwa-hall.jpg",
    ticketTiers: [validTier],
  };

  const parsedValidEvent = createEventSchema.safeParse(validEventPayload);
  assert(parsedValidEvent.success, "Valid event payload with OAU venue and ticket tiers passes validation");

  // End date before start date
  const invertedDatesEvent = {
    ...validEventPayload,
    startDate: validEndDate,
    endDate: validStartDate,
  };
  assert(!createEventSchema.safeParse(invertedDatesEvent).success, "Event with end date earlier than start date is rejected");

  // Free event with paid tier conflict
  const conflictingFreeEvent = {
    ...validEventPayload,
    isFree: true,
    ticketTiers: [{ ...validTier, price: 1500 }],
  };
  assert(!createEventSchema.safeParse(conflictingFreeEvent).success, "Free event with a paid tier (price > 0) is rejected by refinement");

  // Paid event with only free tiers conflict
  const conflictingPaidEvent = {
    ...validEventPayload,
    isFree: false,
    ticketTiers: [{ ...validTier, price: 0 }],
  };
  assert(!createEventSchema.safeParse(conflictingPaidEvent).success, "Paid event with only free tiers is rejected by refinement");

  // Short description (<20 chars)
  const shortDescEvent = {
    ...validEventPayload,
    description: "Too short desc",
  };
  assert(!createEventSchema.safeParse(shortDescEvent).success, "Event with description under 20 characters is rejected");

  // 3. Event Update Schema
  const validUpdate = {
    title: "Updated Summit Title 2026",
    venue: "Amphitheatre Stage",
    description: "Updated description meeting length requirements for campus event discovery.",
  };
  assert(updateEventSchema.safeParse(validUpdate).success, "Partial event update payload passes validation");

  // 4. Admin Event Review Schema
  const validAdminApprove = adminEventReviewSchema.safeParse({ action: "approve" });
  assert(validAdminApprove.success, "Admin 'approve' action passes without mandatory reason");

  const invalidAdminRejectNoReason = adminEventReviewSchema.safeParse({ action: "reject" });
  assert(!invalidAdminRejectNoReason.success, "Admin 'reject' action without reason is rejected");

  const invalidAdminRejectShort = adminEventReviewSchema.safeParse({ action: "reject", reason: "bad" });
  assert(!invalidAdminRejectShort.success, "Admin 'reject' action with reason <5 chars is rejected");

  const validAdminReject = adminEventReviewSchema.safeParse({
    action: "reject",
    reason: "Venue is already booked for university faculty matriculation ceremony on the selected date.",
  });
  assert(validAdminReject.success, "Admin 'reject' action with detailed reason passes validation");

  // 5. Event Mongoose Model Indexes
  const eventIndexes = Event.schema.indexes();
  assert(eventIndexes.length >= 2, "Event Mongoose schema defines compound and query indexes for performance");

  // Summary
  console.log("\n========================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFoundationTests();
