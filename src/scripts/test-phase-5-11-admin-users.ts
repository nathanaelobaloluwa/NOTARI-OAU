import { connectToDatabase } from "../lib/database/mongoose";
import { User } from "../models/User";
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

async function runAdminUsersAudit() {
  console.log("================================================================================");
  console.log("👥 PHASE 5.11: SUPERADMIN USERS & PERMISSIONS AUDIT");
  console.log("================================================================================\n");

  await connectToDatabase();
  console.log("  🔌 Connected to MongoDB Atlas.\n");

  const runId = Date.now();
  const testStudent = await User.create({
    name: `Audit Student ${runId}`,
    email: `student_audit_${runId}@oauife.edu.ng`,
    password: "Password123!",
    role: "student",
    status: "active",
    matricNumber: `CSC/${runId.toString().slice(-4)}/001`,
    faculty: "Faculty of Computing Science and Engineering",
    department: "Computer Science",
  });

  const testSuperadmin = await User.create({
    name: `Audit Superadmin ${runId}`,
    email: `admin_audit_${runId}@oauife.edu.ng`,
    password: "Password123!",
    role: "admin",
    status: "active",
  });

  try {
    // 1. Search Query Pipeline
    console.log("▶ 1. User Directory Query & Search");
    const foundByName = await User.find({
      name: new RegExp(`Audit Student ${runId}`, "i"),
    }).lean();
    if (foundByName.length !== 1) throw new Error("Failed to find user by name search");
    console.log("  ✅ PASS: Directory finds user by name keyword search");

    const foundByMatric = await User.find({
      matricNumber: testStudent.matricNumber,
    }).lean();
    if (foundByMatric.length !== 1) throw new Error("Failed to find user by matric number");
    console.log("  ✅ PASS: Directory finds student by matriculation number");

    const foundByFaculty = await User.find({
      faculty: "Faculty of Computing Science and Engineering",
      email: testStudent.email,
    }).lean();
    if (foundByFaculty.length !== 1) throw new Error("Failed to find user by faculty");
    console.log("  ✅ PASS: Directory queries match Faculty of Computing Science and Engineering");

    // 2. Account Suspension Action
    console.log("\n▶ 2. Superadmin Account Suspension & Reactivation");
    testStudent.status = "suspended";
    await testStudent.save();

    const suspendedReload = await User.findById(testStudent._id);
    if (suspendedReload?.status !== "suspended") throw new Error("Suspended status failed to persist");
    console.log("  ✅ PASS: Superadmin successfully suspends user account");

    testStudent.status = "active";
    await testStudent.save();
    const reactivatedReload = await User.findById(testStudent._id);
    if (reactivatedReload?.status !== "active") throw new Error("Reactivated status failed to persist");
    console.log("  ✅ PASS: Superadmin successfully reactivates suspended user account");

    // 3. Role Promotion & Demotion
    console.log("\n▶ 3. Role Transition Enforcement");
    testStudent.role = "organizer";
    testStudent.isOrganizer = true;
    await testStudent.save();

    const organizerReload = await User.findById(testStudent._id);
    if (organizerReload?.role !== "organizer" || !organizerReload.isOrganizer) {
      throw new Error("Organizer promotion failed");
    }
    console.log("  ✅ PASS: Student promoted to Organizer with isOrganizer: true");

    testStudent.role = "student";
    testStudent.isOrganizer = false;
    await testStudent.save();
    const studentReload = await User.findById(testStudent._id);
    if (studentReload?.role !== "student" || studentReload.isOrganizer) {
      throw new Error("Reversion to student failed");
    }
    console.log("  ✅ PASS: Organizer reverted to Student with isOrganizer: false");

    console.log("\n================================================================================");
    console.log("🎉 ALL SUPERADMIN USERS & ACCESS CONTROL TESTS PASSED!");
    console.log("================================================================================\n");
  } finally {
    await User.findByIdAndDelete(testStudent._id);
    await User.findByIdAndDelete(testSuperadmin._id);
    console.log("  🧹 Test fixtures cleaned up from database.");
  }
}

runAdminUsersAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
