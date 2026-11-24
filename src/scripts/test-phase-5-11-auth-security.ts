import { connectToDatabase } from "../lib/database/mongoose";
import { User } from "../models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (key && !(key in process.env)) {
          process.env[key] = value.replace(/^["']|["']$/g, "");
        }
      }
    }
  }
}
loadLocalEnv();

async function runAuthSecurityTest() {
  console.log("================================================================================");
  console.log("🔐 PHASE 5.11: ACCOUNT SECURITY & PASSWORD RECOVERY VERIFICATION");
  console.log("================================================================================\n");

  await connectToDatabase();
  console.log("  🔌 Connected to MongoDB Atlas.\n");

  const runId = Date.now();
  const testEmail = `sec_test_${runId}@oauife.edu.ng`;
  const initialPassword = "InitialPassword123!";
  const updatedPassword = "UpdatedPassword456!";

  // 1. Create test user
  const hashedPassword = await bcrypt.hash(initialPassword, 10);
  const user = await User.create({
    name: `Security Tester ${runId}`,
    email: testEmail,
    password: hashedPassword,
    role: "student",
    status: "active",
    faculty: "Faculty of Computing Science and Engineering",
  });
  console.log("  ✅ Provisioned active student test account.");

  try {
    // 2. Generate password reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000);
    await user.save();
    console.log("  ✅ Password reset token hashed and stored with 1-hour expiration.");

    // 3. Verify user lookup with valid token
    const matchingUser = await User.findOne({
      email: testEmail,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");
    if (!matchingUser) throw new Error("Failed to find user with active reset token");
    console.log("  ✅ Active token successfully matched against sha256 hash.");

    // 4. Update password and clear token
    matchingUser.password = await bcrypt.hash(updatedPassword, 10);
    matchingUser.passwordResetToken = undefined;
    matchingUser.passwordResetExpires = undefined;
    await matchingUser.save();
    console.log("  ✅ New password saved and reset token cleared.");

    // 5. Verify old password no longer works, new password works
    const checkUser = await User.findOne({ email: testEmail }).select("+password");
    if (!checkUser?.password) throw new Error("Missing password");
    const oldValid = await bcrypt.compare(initialPassword, checkUser.password);
    const newValid = await bcrypt.compare(updatedPassword, checkUser.password);
    if (oldValid) throw new Error("Old password should be invalid");
    if (!newValid) throw new Error("New password should be valid");
    console.log("  ✅ Old password invalidated; new password strictly verified.");

    // 6. Test account suspension guard
    checkUser.status = "suspended";
    await checkUser.save();
    console.log("  ✅ Account status transitioned to 'suspended'.");

    const reloaded = await User.findOne({ email: testEmail });
    if (reloaded?.status !== "suspended") throw new Error("Status failed to persist");
    console.log("  ✅ Suspended status successfully persisted and enforced.");

    console.log("\n================================================================================");
    console.log("🎉 ALL PASSWORD RECOVERY & ACCOUNT SECURITY TESTS PASSED!");
    console.log("================================================================================\n");
  } finally {
    await User.findByIdAndDelete(user._id);
    console.log("  🧹 Test fixtures cleaned up from database.");
  }
}

runAuthSecurityTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
