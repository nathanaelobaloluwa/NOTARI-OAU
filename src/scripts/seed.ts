import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User";
import { OrganizerProfile } from "../models/OrganizerProfile";
import { USER_ROLES, ORGANIZER_STATUS } from "../constants/roles";

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

async function runSeed() {
  // Production safeguard: The seed script is strictly intended for development use.
  // Execution in production is unconditionally prohibited to prevent accidental account creation.
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to run development seed script in a production environment (NODE_ENV=production).");
    console.error("   Development seeding is strictly disabled in production.");
    process.exit(1);
  }

  // Enforce required seed passwords without any hardcoded defaults or predictable fallbacks
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const organizerPassword = process.env.SEED_ORGANIZER_PASSWORD;
  const studentPassword = process.env.SEED_STUDENT_PASSWORD;

  const missingPasswords: string[] = [];
  if (!adminPassword || adminPassword.trim() === "") missingPasswords.push("SEED_ADMIN_PASSWORD");
  if (!organizerPassword || organizerPassword.trim() === "") missingPasswords.push("SEED_ORGANIZER_PASSWORD");
  if (!studentPassword || studentPassword.trim() === "") missingPasswords.push("SEED_STUDENT_PASSWORD");

  if (missingPasswords.length > 0 || !adminPassword || !organizerPassword || !studentPassword) {
    console.error("❌ Missing required seed password environment variable(s):");
    for (const v of missingPasswords) {
      console.error(`   - ${v}`);
    }
    console.error("\nPlease define these variables in your .env.local file before running 'npm run db:seed'.");
    console.error("Example: SEED_ADMIN_PASSWORD=your_secure_development_password_here");
    console.error("Never commit .env.local or real passwords to Git.");
    console.error("See .env.example and docs/DATABASE_SETUP.md for instructions.\n");
    process.exit(1);
    return;
  }

  // Enforce password strength minimum length
  if (adminPassword.length < 8 || organizerPassword.length < 8 || studentPassword.length < 8) {
    console.error("❌ Seed passwords must each be at least 8 characters long.");
    process.exit(1);
  }

  console.log("🌱 Starting NOTARI 2.0 development database seeding...");
  console.log(`🔌 Target MongoDB: ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***:***@")}`);

  try {
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    console.log("✅ Database connection established.");

    // Ensure all Mongoose unique and sparse indexes are explicitly synchronized in MongoDB
    await User.init();
    await OrganizerProfile.init();
    console.log("✅ Database unique & sparse indexes synchronized.");

    // Seed Config from environment (no hardcoded passwords)
    const adminConfig = {
      name: process.env.SEED_ADMIN_NAME || "Super Administrator",
      email: (process.env.SEED_ADMIN_EMAIL || "admin@notari.oau.edu.ng").toLowerCase().trim(),
      password: adminPassword,
    };

    const organizerConfig = {
      name: process.env.SEED_ORGANIZER_NAME || "OAU Tech Innovation Club",
      email: (process.env.SEED_ORGANIZER_EMAIL || "organizer@notari.oau.edu.ng").toLowerCase().trim(),
      password: organizerPassword,
      category: "Technology & Innovation",
      description: "Official campus student technology organization driving student innovation at OAU.",
    };

    const studentConfig = {
      name: process.env.SEED_STUDENT_NAME || "Adeola Johnson",
      email: (process.env.SEED_STUDENT_EMAIL || "student@notari.oau.edu.ng").toLowerCase().trim(),
      password: studentPassword,
      matricNumber: (process.env.SEED_STUDENT_MATRIC || "CSC/2021/042").toUpperCase().trim(),
      faculty: "Faculty of Technology",
      department: "Computer Science & Engineering",
    };

    // 1. Seed Superadmin Account
    const adminHash = await bcrypt.hash(adminConfig.password, 12);
    const adminUser = await User.findOneAndUpdate(
      { email: adminConfig.email },
      {
        name: adminConfig.name,
        email: adminConfig.email,
        password: adminHash,
        role: USER_ROLES.ADMIN,
        isVerified: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`👤 [SUPERADMIN] Seeded account: ${adminUser.email} (Role: ${adminUser.role})`);

    // 2. Seed Organizer Account & Profile
    const orgHash = await bcrypt.hash(organizerConfig.password, 12);
    const orgUser = await User.findOneAndUpdate(
      { email: organizerConfig.email },
      {
        name: organizerConfig.name,
        email: organizerConfig.email,
        password: orgHash,
        role: USER_ROLES.ORGANIZER,
        isVerified: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await OrganizerProfile.findOneAndUpdate(
      { userId: orgUser._id },
      {
        userId: orgUser._id,
        organizationName: organizerConfig.name,
        category: organizerConfig.category,
        description: organizerConfig.description,
        contactEmail: orgUser.email,
        contactPhone: "+2348012345678",
        status: ORGANIZER_STATUS.APPROVED,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`🏢 [ORGANIZER]  Seeded account: ${orgUser.email} (Role: ${orgUser.role})`);

    // 3. Seed Student Account
    const studentHash = await bcrypt.hash(studentConfig.password, 12);
    const studentUser = await User.findOneAndUpdate(
      { email: studentConfig.email },
      {
        name: studentConfig.name,
        email: studentConfig.email,
        password: studentHash,
        role: USER_ROLES.STUDENT,
        matricNumber: studentConfig.matricNumber,
        faculty: studentConfig.faculty,
        department: studentConfig.department,
        isVerified: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`🎓 [STUDENT]    Seeded account: ${studentUser.email} (Role: ${studentUser.role}, Matric: ${studentUser.matricNumber})`);

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("ℹ️  Note: Credentials were read safely from environment variables and hashed before saving.");
  } catch (error) {
    console.error("❌ Database seeding error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Database connection closed.");
  }
}

runSeed();
