import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";
import { loginSchema } from "../validators/auth";

/**
 * Load .env.local if present in project root
 */
function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        let val = trimmed.slice(eqIndex + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadLocalEnv();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/notari_oau";

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

/**
 * Mirror of NextAuth Credentials authorize() logic in src/lib/auth/auth.ts
 */
async function authenticateUser(credentials: { email?: string; password?: string }) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    return { success: false, reason: "validation_failed", user: null };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user || !user.password) {
    return { success: false, reason: "user_not_found", user: null };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { success: false, reason: "invalid_password", user: null };
  }

  return {
    success: true,
    reason: null,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      matricNumber: user.matricNumber,
    },
  };
}

function getExpectedRedirect(role: string): string {
  if (role === USER_ROLES.ADMIN) return "/admin";
  if (role === USER_ROLES.ORGANIZER) return "/organizer";
  return "/student";
}

async function runSeedAuthE2E() {
  console.log("\n================================================================================");
  console.log("🔐 NOTARI 2.0: SEEDED ACCOUNTS END-TO-END AUTHENTICATION TEST");
  console.log("================================================================================\n");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@notari.oau.edu.ng").toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  const orgEmail = (process.env.SEED_ORGANIZER_EMAIL || "organizer@notari.oau.edu.ng").toLowerCase().trim();
  const orgPassword = process.env.SEED_ORGANIZER_PASSWORD;

  const studentEmail = (process.env.SEED_STUDENT_EMAIL || "student@notari.oau.edu.ng").toLowerCase().trim();
  const studentPassword = process.env.SEED_STUDENT_PASSWORD;

  assert(Boolean(adminPassword), "SEED_ADMIN_PASSWORD is set in environment");
  assert(Boolean(orgPassword), "SEED_ORGANIZER_PASSWORD is set in environment");
  assert(Boolean(studentPassword), "SEED_STUDENT_PASSWORD is set in environment");

  if (!adminPassword || !orgPassword || !studentPassword) {
    console.error("❌ Aborting: Missing seed passwords in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Connected to MongoDB Atlas\n");

    // -------------------------------------------------------------------------
    // TEST 1: Superadmin Authentication & Routing
    // -------------------------------------------------------------------------
    console.log("📋 Group 1: Superadmin Account (admin@notari.oau.edu.ng)");
    const adminAuth = await authenticateUser({ email: adminEmail, password: adminPassword });
    assert(adminAuth.success === true, "Superadmin authenticates with valid credentials");
    assert(adminAuth.user?.role === USER_ROLES.ADMIN, "Superadmin user has role 'admin'");
    assert(getExpectedRedirect(adminAuth.user?.role || "") === "/admin", "Superadmin redirects to /admin dashboard");

    const adminDbRecord = await User.findOne({ email: adminEmail }).select("+password");
    assert(adminDbRecord !== null, "Superadmin record exists in database");
    assert(adminDbRecord?.isVerified === true, "Superadmin record is verified (isVerified: true)");
    assert(adminDbRecord?.password?.startsWith("$2"), "Superadmin password stored as bcrypt hash");

    // -------------------------------------------------------------------------
    // TEST 2: Organizer Authentication & Organization Profile
    // -------------------------------------------------------------------------
    console.log("\n📋 Group 2: Organizer Account (organizer@notari.oau.edu.ng)");
    const orgAuth = await authenticateUser({ email: orgEmail, password: orgPassword });
    assert(orgAuth.success === true, "Organizer authenticates with valid credentials");
    assert(orgAuth.user?.role === USER_ROLES.ORGANIZER, "Organizer user has role 'organizer'");
    assert(getExpectedRedirect(orgAuth.user?.role || "") === "/organizer", "Organizer redirects to /organizer dashboard");

    const orgProfile = await OrganizerProfile.findOne({ userId: orgAuth.user?.id });
    assert(orgProfile !== null, "OrganizerProfile exists for seeded organizer");
    assert(orgProfile?.status === ORGANIZER_STATUS.APPROVED, "OrganizerProfile is approved");
    assert(typeof orgProfile?.organizationName === "string", "OrganizerProfile has valid organizationName");

    // -------------------------------------------------------------------------
    // TEST 3: Student Authentication & Academic Profile
    // -------------------------------------------------------------------------
    console.log("\n📋 Group 3: Student Account (student@notari.oau.edu.ng)");
    const studentAuth = await authenticateUser({ email: studentEmail, password: studentPassword });
    assert(studentAuth.success === true, "Student authenticates with valid credentials");
    assert(studentAuth.user?.role === USER_ROLES.STUDENT, "Student user has role 'student'");
    assert(getExpectedRedirect(studentAuth.user?.role || "") === "/student", "Student redirects to /student dashboard");
    assert(studentAuth.user?.matricNumber === "CSC/2021/042", "Student has correct seeded matric number (CSC/2021/042)");

    // -------------------------------------------------------------------------
    // TEST 4: Invalid Password Rejection (All 3 Roles)
    // -------------------------------------------------------------------------
    console.log("\n📋 Group 4: Security Rejection on Invalid Passwords");
    const adminBadAuth = await authenticateUser({ email: adminEmail, password: "IncorrectPassword123!" });
    assert(adminBadAuth.success === false && adminBadAuth.reason === "invalid_password", "Superadmin login rejected on invalid password");

    const orgBadAuth = await authenticateUser({ email: orgEmail, password: "IncorrectPassword123!" });
    assert(orgBadAuth.success === false && orgBadAuth.reason === "invalid_password", "Organizer login rejected on invalid password");

    const studentBadAuth = await authenticateUser({ email: studentEmail, password: "IncorrectPassword123!" });
    assert(studentBadAuth.success === false && studentBadAuth.reason === "invalid_password", "Student login rejected on invalid password");

    // -------------------------------------------------------------------------
    // TEST 5: Non-existent Account Rejection
    // -------------------------------------------------------------------------
    console.log("\n📋 Group 5: Non-Existent Account Rejection");
    const nonExistent = await authenticateUser({ email: "ghost.user.999@oauife.edu.ng", password: "SomeRandomPassword123!" });
    assert(nonExistent.success === false && nonExistent.reason === "user_not_found", "Non-existent user email rejected with user_not_found");

    // -------------------------------------------------------------------------
    // TEST 6: Case-Insensitive Email Normalization
    // -------------------------------------------------------------------------
    console.log("\n📋 Group 6: Case-Insensitive Email Login");
    const mixedCaseAdmin = await authenticateUser({ email: "ADMIN@NOTARI.OAU.EDU.NG", password: adminPassword });
    assert(mixedCaseAdmin.success === true, "Uppercase email 'ADMIN@NOTARI.OAU.EDU.NG' normalizes and logs in successfully");

    const mixedCaseStudent = await authenticateUser({ email: "Student@Notari.Oau.Edu.Ng", password: studentPassword });
    assert(mixedCaseStudent.success === true, "Mixed-case email 'Student@Notari.Oau.Edu.Ng' normalizes and logs in successfully");

    console.log("\n================================================================================");
    console.log(`📊 SEEDED AUTHENTICATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Unexpected test execution error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runSeedAuthE2E();

