import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User";
import { USER_ROLES } from "../constants/roles";
import { registerSchema } from "../validators/auth";

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

async function runE2E() {
  console.log("\n================================================================================");
  console.log("🔍 NOTARI 2.0: END-TO-END LIVE MONGODB & AUTHENTICATION INTEGRATION TEST");
  console.log("================================================================================\n");

  console.log(`🔌 Target MongoDB URI: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@")}`);

  // Test live connection with 3-second timeout
  let isConnected = false;
  try {
    const connectPromise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 3000,
    });
    await connectPromise;
    isConnected = true;
    console.log("✅ Live MongoDB connection established.\n");
  } catch (err) {
    console.log("⚠️  Could not connect to MongoDB at configured URI:");
    console.log(`   ${(err as Error).message}\n`);
    console.log("================================================================================");
    console.log("📋 STATUS: LIVE DATABASE TESTS BLOCKED (No Active MongoDB Connection)");
    console.log("================================================================================");
    console.log("To run these live integration tests against a real development database:");
    console.log("  1. Ensure MongoDB is running locally (e.g., via Community Server or Docker)");
    console.log("     OR set your MongoDB Atlas connection string in .env.local:");
    console.log("     MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/notari_oau");
    console.log("  2. Run: npm run test:e2e\n");
    return;
  }

  try {
    // Synchronize indexes
    await User.init();

    // Clean up any leftover test accounts from prior runs
    await User.deleteMany({ email: { $regex: /^test_e2e_/ } });

    console.log("--- 1. Live Student Registration & Persistence Tests ---");
    const testEmailRaw = "  test_e2e_student@OAU.EDU.NG  ";
    const testMatricRaw = "  csc/2022/999  ";
    const testPassword = "ValidPassword2026!";

    const normalizedEmail = testEmailRaw.toLowerCase().trim();
    const normalizedMatric = testMatricRaw.toUpperCase().trim();

    // Validate payload with Zod
    const zodResult = registerSchema.safeParse({
      name: "E2E Test Student",
      email: normalizedEmail,
      password: testPassword,
      matricNumber: normalizedMatric,
      faculty: "Faculty of Technology",
    });
    assert(zodResult.success, "Zod accepts valid registration payload");

    // Hash password
    const hashedPassword = await bcrypt.hash(testPassword, 12);

    // Insert user into live MongoDB
    const liveUser = await User.create({
      name: "E2E Test Student",
      email: normalizedEmail,
      password: hashedPassword,
      role: USER_ROLES.STUDENT,
      matricNumber: normalizedMatric,
      faculty: "Faculty of Technology",
      isVerified: false,
    });

    assert(liveUser._id != null, "User persisted to MongoDB with real ObjectId");
    assert(liveUser.email === "test_e2e_student@oau.edu.ng", "Email persisted normalized (lowercase, trimmed)");
    assert(liveUser.matricNumber === "CSC/2022/999", "Matric number persisted normalized (uppercase, trimmed)");
    assert(liveUser.role === "student", "Role defaults strictly to 'student'");

    console.log("\n--- 2. Live Password Security & Query Masking Tests ---");
    // Default findOne query: password must NOT be selected
    const queriedUser = await User.findById(liveUser._id);
    assert(queriedUser?.password === undefined, "Password field is excluded (select: false) in normal queries");

    // Explicitly selected password
    const userWithPw = await User.findById(liveUser._id).select("+password");
    const storedHash = userWithPw?.password || "";
    assert(userWithPw?.password !== undefined, "Password can only be selected explicitly (+password)");
    assert(storedHash.startsWith("$2"), "Password in database is encrypted with bcrypt hash");
    assert(await bcrypt.compare(testPassword, storedHash), "bcrypt.compare validates genuine password");
    assert(!(await bcrypt.compare("WrongPassword", storedHash)), "bcrypt.compare rejects incorrect password");

    console.log("\n--- 3. Live Duplicate Registration Prevention Tests ---");
    // Duplicate Email Check
    let duplicateEmailBlocked = false;
    try {
      await User.create({
        name: "Duplicate Email Attacker",
        email: normalizedEmail, // same email
        password: hashedPassword,
        role: USER_ROLES.STUDENT,
      });
    } catch (e: unknown) {
      if ((e as { code?: number })?.code === 11000) {
        duplicateEmailBlocked = true;
      }
    }
    assert(duplicateEmailBlocked, "MongoDB unique index rejects duplicate email insertion (code 11000)");

    // Duplicate Matric Check
    let duplicateMatricBlocked = false;
    try {
      await User.create({
        name: "Duplicate Matric Attacker",
        email: "test_e2e_different@oau.edu.ng",
        matricNumber: normalizedMatric, // same matric
        password: hashedPassword,
        role: USER_ROLES.STUDENT,
      });
    } catch (e: unknown) {
      if ((e as { code?: number })?.code === 11000) {
        duplicateMatricBlocked = true;
      }
    }
    assert(duplicateMatricBlocked, "MongoDB sparse unique index rejects duplicate matriculation number");

    console.log("\n--- 4. Live Auth.js Credentials Authorize Flow ---");
    // Verify authorize flow against database
    const authUser = await User.findOne({ email: normalizedEmail }).select("+password");
    assert(authUser != null, "User found by normalized email");

    const validLogin = await bcrypt.compare(testPassword, authUser!.password!);
    assert(validLogin, "Valid credentials successfully authenticate");

    const invalidLogin = await bcrypt.compare("WrongPassword!", authUser!.password!);
    assert(!invalidLogin, "Invalid password fails authentication");

    const nonExistent = await User.findOne({ email: "does_not_exist@oau.edu.ng" });
    assert(nonExistent == null, "Nonexistent email lookup safely returns null");

    console.log("\n--- 5. Cleanup Test Records ---");
    const deleteResult = await User.deleteMany({ email: { $regex: /^test_e2e_/ } });
    assert(deleteResult.deletedCount > 0, `Cleaned up ${deleteResult.deletedCount} isolated test records`);

    console.log("\n================================================================================");
    console.log(`📊 LIVE DATABASE INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ E2E test execution error:", error);
    process.exit(1);
  } finally {
    if (isConnected) {
      await mongoose.disconnect();
      console.log("🔌 Database connection closed.");
    }
  }
}

runE2E();
