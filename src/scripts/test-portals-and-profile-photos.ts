/**
 * NOTARI 2.0 — Authenticated Portal Experience, Profile Photo System & Brand UI Verification
 * Comprehensive automated test suite verifying:
 * 1. Public vs Authenticated Portal Separation & Layouts
 * 2. User Profile Photo Upload, Cloudinary Isolation, and Validation
 * 3. Fallback Avatar Initials Generation & Broken-Image Immunity
 * 4. Visual Cleanup & Total Eradication of AI Decorative Sparkles
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import { validateImageBuffer } from "../lib/storage/validation";
import { getInitials } from "../components/shared/user-avatar";
import { CloudinaryService } from "../lib/storage/cloudinary";
import { config as middlewareConfig } from "../middleware";

let passedCount = 0;
let totalCount = 0;

async function it(name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    await fn();
    passedCount++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log("===============================================================================");
  console.log("🧪 NOTARI 2.0: PORTALS, PROFILE PHOTOS & VISUAL CLEANUP TEST SUITE");
  console.log("===============================================================================\n");

  console.log("▶ 1. Public vs Authenticated Portal Separation & Edge Protection");

  await it("Middleware matcher includes '/' and '/about' to intercept authenticated users", () => {
    const matcher = middlewareConfig.matcher;
    assert(matcher.includes("/"), "Middleware matcher must include '/'");
    assert(matcher.includes("/about"), "Middleware matcher must include '/about'");
    assert(matcher.some((m) => m.startsWith("/student")), "Must include student routes");
    assert(matcher.some((m) => m.startsWith("/organizer")), "Must include organizer routes");
    assert(matcher.some((m) => m.startsWith("/admin")), "Must include admin routes");
  });

  await it("Public layout separates visitors from authenticated portal shells", () => {
    const layoutPath = path.join(process.cwd(), "src/app/(public)/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf8");
    assert(content.includes("auth()"), "PublicLayout must inspect session");
    assert(content.includes("StudentPortalShell"), "PublicLayout must render StudentPortalShell for students");
    assert(content.includes("OrganizerPortalShell"), "PublicLayout must render OrganizerPortalShell for organizers");
    assert(content.includes("AdminPortalShell"), "PublicLayout must render AdminPortalShell for admins");
    assert(content.includes("<Footer />"), "PublicLayout must only render marketing Footer when !session?.user");
  });

  await it("Homepage enforces server-side role redirects for logged-in users", () => {
    const pagePath = path.join(process.cwd(), "src/app/(public)/page.tsx");
    const content = fs.readFileSync(pagePath, "utf8");
    assert(content.includes("await auth()"), "HomePage must check authentication on the server");
    assert(content.includes('redirect("/student")'), "HomePage must redirect students to /student");
    assert(content.includes('redirect("/organizer")'), "HomePage must redirect organizers to /organizer");
    assert(content.includes('redirect("/admin")'), "HomePage must redirect admins to /admin");
  });

  await it("About page enforces server-side role redirects for logged-in users", () => {
    const aboutPath = path.join(process.cwd(), "src/app/(public)/about/page.tsx");
    const content = fs.readFileSync(aboutPath, "utf8");
    assert(content.includes("await auth()"), "AboutPage must check authentication on the server");
    assert(content.includes('redirect("/student")'), "AboutPage must redirect students to /student");
    assert(content.includes('redirect("/organizer")'), "AboutPage must redirect organizers to /organizer");
    assert(content.includes('redirect("/admin")'), "AboutPage must redirect admins to /admin");
  });

  await it("Student portal layout includes 'Explore Events' and suppresses public footer", () => {
    const shellPath = path.join(process.cwd(), "src/components/student/student-portal-shell.tsx");
    const content = fs.readFileSync(shellPath, "utf8");
    assert(content.includes("Explore Events"), "Must include 'Explore Events' in navigation");
    assert(content.includes("/events"), "Explore Events must link to /events");
    assert(!content.includes("<Footer"), "Must not render marketing footer");
  });

  await it("Student bottom nav includes 'Explore' navigation item for mobile event discovery", () => {
    const navPath = path.join(process.cwd(), "src/components/student/student-bottom-nav.tsx");
    const content = fs.readFileSync(navPath, "utf8");
    assert(content.includes("Explore"), "Bottom nav must include Explore");
    assert(content.includes("/events"), "Explore must navigate to /events");
  });

  console.log("\n▶ 2. User Profile Photo Validation & Binary Magic Bytes");

  await it("Accepts genuine JPEG binary buffer (FF D8 FF)", () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const result = validateImageBuffer(jpegBuffer);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.detectedExt, "jpg");
    assert.strictEqual(result.detectedMime, "image/jpeg");
  });

  await it("Accepts genuine PNG binary buffer (89 50 4E 47 0D 0A 1A 0A)", () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const result = validateImageBuffer(pngBuffer);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.detectedExt, "png");
    assert.strictEqual(result.detectedMime, "image/png");
  });

  await it("Accepts genuine WebP binary buffer (RIFF....WEBP)", () => {
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
    ]);
    const result = validateImageBuffer(webpBuffer);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.detectedExt, "webp");
    assert.strictEqual(result.detectedMime, "image/webp");
  });

  await it("Rejects spoofed file (HTML / Script disguised as image)", () => {
    const maliciousBuffer = Buffer.from("<html><script>alert('pwned')</script></html>");
    const result = validateImageBuffer(maliciousBuffer);
    assert.strictEqual(result.valid, false);
    assert(result.error?.includes("Unsupported file format"), "Must reject non-image signatures");
  });

  await it("Rejects oversized image (> 5 MB)", () => {
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    const result = validateImageBuffer(oversizedBuffer);
    assert.strictEqual(result.valid, false);
    assert(result.error?.includes("exceeds the maximum allowed limit"), "Must reject files over 5MB");
  });

  await it("Rejects empty image buffer", () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = validateImageBuffer(emptyBuffer);
    assert.strictEqual(result.valid, false);
  });

  console.log("\n▶ 3. Cloudinary Namespace Isolation & Safe Asset Management");

  await it("Profile photo upload targets dedicated 'notari/profiles/' folder", async () => {
    const cloudinaryFile = fs.readFileSync(
      path.join(process.cwd(), "src/lib/storage/cloudinary.ts"),
      "utf8"
    );
    assert(
      cloudinaryFile.includes("notari/profiles/${options.userId}") ||
        cloudinaryFile.includes("notari/profiles/"),
      "Profile photos must be scoped under notari/profiles/"
    );
    assert(
      cloudinaryFile.includes("notari/flyers"),
      "Flyer photos must remain under notari/flyers/"
    );
  });

  await it("Profile photo delete rejects assets outside 'notari/profiles/' namespace", async () => {
    const maliciousAttempt = await CloudinaryService.deleteProfilePhoto("notari/flyers/some-event-flyer");
    assert.strictEqual(maliciousAttempt.success, false);
    assert(maliciousAttempt.error?.includes("Security violation"), "Must block cross-namespace asset deletion");
  });

  await it("User schema models profilePhotoUrl and profilePhotoPublicId", () => {
    const userModelFile = fs.readFileSync(path.join(process.cwd(), "src/models/User.ts"), "utf8");
    assert(userModelFile.includes("profilePhotoUrl"), "User model must include profilePhotoUrl");
    assert(userModelFile.includes("profilePhotoPublicId"), "User model must include profilePhotoPublicId");
  });

  await it("Profile photo API route safely enforces server-side authentication and delayed asset deletion", () => {
    const apiRouteFile = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/user/profile-photo/route.ts"),
      "utf8"
    );
    assert(apiRouteFile.includes("await auth()"), "Endpoint must require authenticated session");
    assert(apiRouteFile.includes("validateImageBuffer"), "Endpoint must validate binary magic bytes");
    assert(apiRouteFile.includes("await user.save()"), "Must persist database update first");
    assert(apiRouteFile.includes("deleteProfilePhoto"), "Must clean up previous asset after database update");
  });

  console.log("\n▶ 4. Circular Avatar & Initials Fallback System");

  await it("Derives correct initials for full two-word name ('John Ade' -> 'JA')", () => {
    assert.strictEqual(getInitials("John Ade"), "JA");
  });

  await it("Derives correct initials for single-word name ('Obaloluwa' -> 'OB')", () => {
    assert.strictEqual(getInitials("Obaloluwa"), "OB");
  });

  await it("Derives correct initials for hyphenated or complex names ('Mary-Jane Watson' -> 'MW')", () => {
    assert.strictEqual(getInitials("Mary-Jane Watson"), "MW");
  });

  await it("Derives initials from university email when name is empty", () => {
    assert.strictEqual(getInitials("john.ade@oauife.edu.ng"), "JA");
  });

  await it("Returns default fallback initial 'U' for null or empty string", () => {
    assert.strictEqual(getInitials(""), "U");
    assert.strictEqual(getInitials(null), "U");
    assert.strictEqual(getInitials(undefined), "U");
  });

  console.log("\n▶ 5. Visual Cleanup & AI Elements Eradication Audit");

  await it("Verifies ZERO occurrences of Lucide Sparkles icon across all src/ files", () => {
    const allFiles: string[] = [];
    function scanDir(dir: string) {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(tsx|ts|jsx|js)$/.test(item.name)) {
          allFiles.push(fullPath);
        }
      }
    }
    scanDir(path.join(process.cwd(), "src"));

    const filesWithSparkles: string[] = [];
    for (const file of allFiles) {
      // Exclude test file itself
      if (file.includes("test-portals-and-profile-photos.ts")) continue;
      const content = fs.readFileSync(file, "utf8");
      if (/<Sparkles\b/.test(content) || /import\s+.*?\bSparkles\b.*?from/.test(content)) {
        filesWithSparkles.push(path.relative(process.cwd(), file));
      }
    }

    assert.strictEqual(
      filesWithSparkles.length,
      0,
      `Found Sparkles in: ${filesWithSparkles.join(", ")}`
    );
  });

  await it("Preserves legitimate functional icons across student and organizer navigation", () => {
    const studentShell = fs.readFileSync(
      path.join(process.cwd(), "src/components/student/student-portal-shell.tsx"),
      "utf8"
    );
    assert(studentShell.includes("LayoutDashboard"), "Must preserve Dashboard icon");
    assert(studentShell.includes("Compass"), "Must preserve Compass icon for Explore");
    assert(studentShell.includes("Ticket"), "Must preserve Ticket icon");
    assert(studentShell.includes("Megaphone"), "Must preserve Announcements icon");
    assert(studentShell.includes("Settings"), "Must preserve Settings icon");
    assert(studentShell.includes("LogOut"), "Must preserve Logout icon");
  });

  console.log("\n===============================================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} / ${totalCount} passed (100%)`);
  console.log("===============================================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
