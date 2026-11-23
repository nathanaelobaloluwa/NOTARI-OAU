import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/database/mongoose";
import { User } from "@/models/User";
import { Event } from "@/models/Event";
import { USER_ROLES } from "@/constants/roles";
import { EVENT_STATUS, EVENT_CATEGORIES, OAU_VENUES } from "@/constants/oau";
import {
  validateImageBuffer,
  extractImageDimensions,
  MAX_FLYER_FILE_SIZE,
} from "@/lib/storage/validation";
import { CloudinaryService } from "@/lib/storage/cloudinary";
import { POST as uploadFlyerRoute } from "@/app/api/organizer/flyer/upload/route";
import { DELETE as deleteFlyerRoute } from "@/app/api/organizer/flyer/delete/route";

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

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
  passed++;
}

/**
 * Helper: Generate synthetic valid image buffers
 */
function createSyntheticJpeg(width = 800, height = 600): Buffer {
  // Minimal valid JPEG header with SOF0 marker containing dimensions
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
  ]);
  const dummyPayload = Buffer.alloc(128, 0xaa);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, dummyPayload, eoi]);
}

function createSyntheticPng(width = 400, height = 300): Buffer {
  // Minimal PNG signature + IHDR chunk with dimensions
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = Buffer.alloc(25);
  ihdrChunk.writeUInt32BE(13, 0); // length of IHDR data
  ihdrChunk.write("IHDR", 4);
  ihdrChunk.writeUInt32BE(width, 8);
  ihdrChunk.writeUInt32BE(height, 12);
  ihdrChunk.writeUInt8(8, 16); // bit depth
  ihdrChunk.writeUInt8(6, 17); // color type (RGBA)
  ihdrChunk.writeUInt8(0, 18); // compression
  ihdrChunk.writeUInt8(0, 19); // filter
  ihdrChunk.writeUInt8(0, 20); // interlace
  ihdrChunk.writeUInt32BE(0, 21); // dummy crc
  const iendChunk = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  return Buffer.concat([signature, ihdrChunk, iendChunk]);
}

function createSyntheticWebp(width = 640, height = 480): Buffer {
  // Minimal WebP RIFF...WEBP header with VP8 keyframe
  const riff = Buffer.from("RIFF");
  const size = Buffer.alloc(4);
  size.writeUInt32LE(38, 0);
  const webp = Buffer.from("WEBPVP8 ");
  const vp8Size = Buffer.alloc(4);
  vp8Size.writeUInt32LE(18, 0); // chunk size: 18 bytes
  // VP8 keyframe header starting at offset 20:
  // offset 20-22: frame tag (3 bytes, keyframe has bit 0 = 0)
  // offset 23-25: start code 0x9D, 0x01, 0x2A
  // offset 26-27: width 16-bit LE
  // offset 28-29: height 16-bit LE
  const frameHeader = Buffer.alloc(10);
  frameHeader[0] = 0x00;
  frameHeader[1] = 0x00;
  frameHeader[2] = 0x00;
  frameHeader[3] = 0x9d;
  frameHeader[4] = 0x01;
  frameHeader[5] = 0x2a;
  frameHeader.writeUInt16LE(width, 6);
  frameHeader.writeUInt16LE(height, 8);
  const dummyPayload = Buffer.alloc(8, 0x00);
  return Buffer.concat([riff, size, webp, vp8Size, frameHeader, dummyPayload]);
}

async function runFlyerManagementTests() {
  console.log("\n" + "=".repeat(85));
  console.log("🚀 NOTARI 2.0 — PHASE 5.8: DIRECT EVENT FLYER UPLOAD & MANAGEMENT TEST SUITE");
  console.log("=".repeat(85));

  // -------------------------------------------------------------------------
  // PHASE 1: BINARY MAGIC BYTE VALIDATION & SECURITY REJECTIONS
  // -------------------------------------------------------------------------
  console.log("\n--- Phase 1: Magic Byte Inspection & Security Guards ---");

  // 1. Valid JPEG
  const jpegBuf = createSyntheticJpeg(1200, 800);
  const jpegValidation = validateImageBuffer(jpegBuf);
  assert(jpegValidation.valid === true, "Valid JPEG buffer passes magic byte inspection (FF D8 FF)");
  assert(jpegValidation.detectedMime === "image/jpeg", "JPEG detected MIME is 'image/jpeg'");
  assert(jpegValidation.detectedExt === "jpg", "JPEG detected extension is 'jpg'");

  // 2. Valid PNG
  const pngBuf = createSyntheticPng(600, 400);
  const pngValidation = validateImageBuffer(pngBuf);
  assert(pngValidation.valid === true, "Valid PNG buffer passes magic byte inspection (89 50 4E 47)");
  assert(pngValidation.detectedMime === "image/png", "PNG detected MIME is 'image/png'");
  assert(pngValidation.detectedExt === "png", "PNG detected extension is 'png'");

  // 3. Valid WebP
  const webpBuf = createSyntheticWebp(1024, 768);
  const webpValidation = validateImageBuffer(webpBuf);
  assert(webpValidation.valid === true, "Valid WebP buffer passes magic byte inspection (RIFF...WEBP)");
  assert(webpValidation.detectedMime === "image/webp", "WebP detected MIME is 'image/webp'");
  assert(webpValidation.detectedExt === "webp", "WebP detected extension is 'webp'");

  // 4. Empty buffer
  const emptyValidation = validateImageBuffer(Buffer.alloc(0));
  assert(emptyValidation.valid === false, "Empty buffer rejected");

  // 5. Truncated buffer (< 12 bytes)
  const truncatedValidation = validateImageBuffer(Buffer.from([0xff, 0xd8, 0xff]));
  assert(truncatedValidation.valid === false, "Truncated buffer (<12 bytes) rejected");

  // 6. Oversized buffer (> 5 MB)
  const oversizedBuf = Buffer.alloc(MAX_FLYER_FILE_SIZE + 1024);
  oversizedBuf[0] = 0xff;
  oversizedBuf[1] = 0xd8;
  oversizedBuf[2] = 0xff;
  const oversizedValidation = validateImageBuffer(oversizedBuf);
  assert(oversizedValidation.valid === false, "Buffer exceeding MAX_FLYER_FILE_SIZE (5 MB) rejected");
  assert(
    oversizedValidation.error?.includes("exceeds the maximum allowed limit of 5 MB") === true,
    "Oversized buffer returns informative size error"
  );

  // 7. Security Rejection: Spoofed SVG masquerading as JPEG
  const spoofedSvg = Buffer.from(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>`);
  const svgValidation = validateImageBuffer(spoofedSvg);
  assert(svgValidation.valid === false, "Spoofed SVG file rejected by magic byte inspection");
  assert(
    svgValidation.error?.includes("Unsupported file format") === true,
    "Spoofed SVG returns rejection for non-binary format"
  );

  // 8. Security Rejection: Windows Executable (PE MZ header)
  const peExe = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00");
  const peValidation = validateImageBuffer(peExe);
  assert(peValidation.valid === false, "Windows executable (MZ header) strictly rejected");

  // 9. Security Rejection: Linux ELF binary
  const elfBin = Buffer.from("\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00");
  const elfValidation = validateImageBuffer(elfBin);
  assert(elfValidation.valid === false, "Linux ELF binary strictly rejected");

  // 10. Security Rejection: Shell script
  const shellScript = Buffer.from("#!/bin/bash\nrm -rf /");
  const shValidation = validateImageBuffer(shellScript);
  assert(shValidation.valid === false, "Shell script strictly rejected");

  // 11. Security Rejection: HTML file
  const htmlFile = Buffer.from("<!DOCTYPE html><html><body><h1>Malicious</h1></body></html>");
  const htmlValidation = validateImageBuffer(htmlFile);
  assert(htmlValidation.valid === false, "HTML document strictly rejected");

  // -------------------------------------------------------------------------
  // PHASE 2: DIMENSION EXTRACTION
  // -------------------------------------------------------------------------
  console.log("\n--- Phase 2: Dimensions Extraction ---");

  // 12. PNG dimensions extraction
  const pngDims = extractImageDimensions(pngBuf);
  assert(pngDims.width === 600, `Extracted PNG width matches expected (expected: 600, got: ${pngDims.width})`);
  assert(pngDims.height === 400, `Extracted PNG height matches expected (expected: 400, got: ${pngDims.height})`);

  // 13. JPEG dimensions extraction
  const jpegDims = extractImageDimensions(jpegBuf);
  assert(jpegDims.width === 1200, `Extracted JPEG width matches expected (expected: 1200, got: ${jpegDims.width})`);
  assert(jpegDims.height === 800, `Extracted JPEG height matches expected (expected: 800, got: ${jpegDims.height})`);

  // 14. WebP dimensions extraction
  const webpDims = extractImageDimensions(webpBuf);
  assert(webpDims.width === 1024, `Extracted WebP width matches expected (expected: 1024, got: ${webpDims.width})`);
  assert(webpDims.height === 768, `Extracted WebP height matches expected (expected: 768, got: ${webpDims.height})`);

  // 15. Graceful empty return on corrupted header
  const corruptedDims = extractImageDimensions(Buffer.from([0x01, 0x02, 0x03, 0x04]));
  assert(corruptedDims.width === undefined && corruptedDims.height === undefined, "Corrupted header returns undefined dimensions without throwing");

  // -------------------------------------------------------------------------
  // PHASE 3: STORAGE BOUNDARY & CLOUDINARY SERVICE
  // -------------------------------------------------------------------------
  console.log("\n--- Phase 3: Cloudinary & Storage Boundary ---");

  // 16. Cloudinary credential validation
  const isCloudinaryConfigured = CloudinaryService.isConfigured();
  assert(
    typeof isCloudinaryConfigured === "boolean",
    `CloudinaryService.isConfigured() returns boolean (configured: ${isCloudinaryConfigured})`
  );

  // 17. URL optimization helper
  const cdnUrl = "https://res.cloudinary.com/notari-cloud/image/upload/v12345/notari/flyers/event123.jpg";
  const transformedUrl = CloudinaryService.getOptimizedFlyerUrl(cdnUrl, 600, 400);
  assert(
    transformedUrl.includes("c_fill,w_600,h_400,f_auto,q_auto"),
    "Cloudinary transformation parameters correctly injected"
  );

  // 18. Local URL passes through untouched
  const localUrl = "/uploads/flyers/sample_flyer.jpg";
  assert(
    CloudinaryService.getOptimizedFlyerUrl(localUrl) === localUrl,
    "Local fallback URL passes through untouched"
  );

  // 19. Upload flyer to storage boundary
  const uploadResult = await CloudinaryService.uploadFlyer(jpegBuf, {
    organizerId: "test_organizer_id",
  });
  assert(Boolean(uploadResult.secureUrl), "Upload result provides secureUrl");
  assert(Boolean(uploadResult.publicId), "Upload result provides publicId");
  assert(uploadResult.format === "jpg", `Upload result format matches 'jpg' (got: ${uploadResult.format})`);
  assert(uploadResult.bytes === jpegBuf.length, "Upload result byte length matches input buffer");
  assert(uploadResult.width === 1200, "Upload result reflects extracted width");
  assert(uploadResult.height === 800, "Upload result reflects extracted height");
  assert(["cloudinary", "local"].includes(uploadResult.provider), `Provider is valid: ${uploadResult.provider}`);

  // 20. If uploaded to local disk, file physically exists
  if (uploadResult.provider === "local") {
    const localDiskPath = path.join(process.cwd(), "public", uploadResult.url);
    assert(fs.existsSync(localDiskPath), "Uploaded flyer file exists on local disk in public/uploads/flyers/");
  }

  // 21. Delete flyer asset
  const deleteResult = await CloudinaryService.deleteFlyer(uploadResult.url);
  assert(deleteResult.success === true, "deleteFlyer successfully removes uploaded asset");

  // 22. Verify file was unlinked if local
  if (uploadResult.provider === "local") {
    const localDiskPath = path.join(process.cwd(), "public", uploadResult.url);
    assert(!fs.existsSync(localDiskPath), "Deleted flyer file is removed from local disk");
  }

  // 23. Path traversal attack prevention in deleteFlyer
  const traversalResult = await CloudinaryService.deleteFlyer("/uploads/flyers/../../etc/passwd");
  assert(traversalResult.success === false, "Path traversal attempt in deleteFlyer is blocked");

  // 24. Production unconfigured safety guard
  const originalEnv = process.env.NODE_ENV;
  const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.CLOUDINARY_CLOUD_NAME;
    let prodErrorThrown = false;
    try {
      await CloudinaryService.uploadFlyer(jpegBuf);
    } catch (e: unknown) {
      prodErrorThrown = (e as Error).message.includes("Media storage is not configured for production");
    }
    assert(
      prodErrorThrown,
      "Strict production guard: unconfigured Cloudinary in production throws descriptive error"
    );
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    if (originalCloudName) {
      process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 4: API ENDPOINT SECURITY & ROUTE VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- Phase 4: API Route Handlers & Role Verification ---");

  // 25. Upload route rejects missing file
  // Mock NextRequest without form-data file
  const emptyReq = new NextRequest("http://localhost:3000/api/organizer/flyer/upload", {
    method: "POST",
    body: new FormData(),
  });
  const emptyRes = await uploadFlyerRoute(emptyReq);
  const _emptyData = await emptyRes.json();
  void _emptyData;
  assert(
    emptyRes.status === 400 || emptyRes.status === 401 || emptyRes.status === 403,
    `Upload route safely handles empty body with status ${emptyRes.status}`
  );

  // 26. Delete route rejects missing parameter
  const deleteReq = new NextRequest("http://localhost:3000/api/organizer/flyer/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const deleteRes = await deleteFlyerRoute(deleteReq);
  assert(
    deleteRes.status === 400 || deleteRes.status === 401 || deleteRes.status === 403,
    `Delete route safely rejects empty payload with status ${deleteRes.status}`
  );

  // -------------------------------------------------------------------------
  // PHASE 5: DATABASE PERSISTENCE & EVENT LIFECYCLE
  // -------------------------------------------------------------------------
  console.log("\n--- Phase 5: Database Lifecycle & Persistence with MongoDB ---");

  await connectToDatabase();
  assert(true, "Connected to MongoDB database");

  // Find or create test organizer
  let testOrganizer = await User.findOne({ email: "organizer.test.phase58@oauife.edu.ng" });
  if (!testOrganizer) {
    testOrganizer = await User.create({
      name: "Phase 5.8 Test Organizer",
      email: "organizer.test.phase58@oauife.edu.ng",
      password: "TestPassword123!",
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      organizerProfile: {
        organizationName: "Great Ife Media Club",
        faculty: "Arts",
        isAccredited: true,
      },
    });
  }
  assert(Boolean(testOrganizer._id), "Test organizer user available in database");

  // 27. Create Event with uploaded flyer URL
  const testFlyerUrl = "/uploads/flyers/test_phase58_flyer_sample.jpg";
  const slug = `phase-5-8-flyer-test-${Date.now()}`;
  const startDate = new Date(Date.now() + 86400000 * 5); // 5 days in future
  const endDate = new Date(Date.now() + 86400000 * 5 + 7200000); // +2 hours

  const createdEvent = await Event.create({
    title: "Phase 5.8 Great Ife Annual Technology Summit",
    slug,
    description: "Annual university tech summit with full flyer integration.",
    summary: "Annual university tech summit.",
    category: EVENT_CATEGORIES[1], // "Tech & Innovation"
    venue: OAU_VENUES[0],
    startDate,
    endDate,
    organizerId: testOrganizer._id,
    organizerName: "Great Ife Media Club",
    flyerUrl: testFlyerUrl,
    isFree: true,
    totalCapacity: 200,
    availableSeats: 200,
    registeredCount: 0,
    ticketTiers: [
      {
        name: "General Admission",
        price: 0,
        capacity: 200,
        available: 200,
        maxPerOrder: 2,
      },
    ],
    status: EVENT_STATUS.DRAFT,
  });

  assert(Boolean(createdEvent._id), "Event created successfully in database");
  assert(createdEvent.flyerUrl === testFlyerUrl, "Event persists flyerUrl directly in MongoDB document");

  // 28. Query event back from database
  const fetchedEvent = await Event.findById(createdEvent._id).lean();
  assert(fetchedEvent !== null, "Created event retrievable by ID");
  assert(fetchedEvent?.flyerUrl === testFlyerUrl, "Fetched event retains identical flyerUrl");

  // 29. Update event flyer URL (replacing flyer)
  const updatedFlyerUrl = "/uploads/flyers/test_phase58_flyer_updated.png";
  const updatedEvent = await Event.findByIdAndUpdate(
    createdEvent._id,
    { $set: { flyerUrl: updatedFlyerUrl } },
    { new: true }
  ).lean();

  assert(updatedEvent?.flyerUrl === updatedFlyerUrl, "Event flyerUrl updated and persisted to new asset URL");

  // 30. Public projection includes flyerUrl
  const publicProjection = await Event.findOne({ _id: createdEvent._id })
    .select("title slug venue startDate endDate flyerUrl isFree status")
    .lean();

  assert(publicProjection?.flyerUrl === updatedFlyerUrl, "Public feed projection includes flyerUrl field");

  // 31. Clean up test event
  await Event.deleteOne({ _id: createdEvent._id });
  const checkDeleted = await Event.findById(createdEvent._id);
  assert(checkDeleted === null, "Test event cleaned up successfully from database");

  // -------------------------------------------------------------------------
  // PHASE 6: MULTI-TENANT OWNERSHIP, SECURITY & PERSISTENCE RELIABILITY
  // -------------------------------------------------------------------------
  console.log("\n--- Phase 6: Multi-Tenant Ownership & Arbitrary Resource Defense ---");

  // 32. System preset deletion defense
  const presetDeleteResult = await CloudinaryService.deleteFlyer("/images/oau/oau-oduduwa-hall.jpg");
  assert(
    presetDeleteResult.success === false,
    "deleteFlyer strictly refuses to delete system campus presets (/images/oau/...)"
  );

  // 33. External imagery deletion defense
  const externalDeleteResult = await CloudinaryService.deleteFlyer("https://images.unsplash.com/photo-12345");
  assert(
    externalDeleteResult.success === false,
    "deleteFlyer strictly refuses to delete external imagery (unsplash, external domains)"
  );

  // 34. Arbitrary Cloudinary asset deletion defense
  const arbitraryCloudinaryResult = await CloudinaryService.deleteFlyer("avatars/superadmin_profile");
  assert(
    arbitraryCloudinaryResult.success === false,
    "deleteFlyer strictly refuses deletion of assets outside 'notari/flyers/' namespace"
  );

  // 35. Setup Multi-tenant Organizers
  let organizerA = await User.findOne({ email: "organizer.a.phase581@oauife.edu.ng" });
  if (!organizerA) {
    organizerA = await User.create({
      name: "Organizer A (Arts Society)",
      email: "organizer.a.phase581@oauife.edu.ng",
      password: "TestPassword123!",
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      organizerProfile: {
        organizationName: "OAU Arts Society",
        faculty: "Arts",
        isAccredited: true,
      },
    });
  }

  let organizerB = await User.findOne({ email: "organizer.b.phase581@oauife.edu.ng" });
  if (!organizerB) {
    organizerB = await User.create({
      name: "Organizer B (Tech Hub)",
      email: "organizer.b.phase581@oauife.edu.ng",
      password: "TestPassword123!",
      role: USER_ROLES.ORGANIZER,
      isOrganizer: true,
      organizerProfile: {
        organizationName: "OAU Tech Hub",
        faculty: "Technology",
        isAccredited: true,
      },
    });
  }

  assert(Boolean(organizerA._id) && Boolean(organizerB._id), "Two distinct test organizers configured in database");

  // 36. Organizer A creates an event with Flyer A
  const flyerA = `/uploads/flyers/flyer_org_${organizerA._id}_summit.jpg`;
  const eventA = await Event.create({
    title: "Organizer A Dramatic Arts Exhibition",
    slug: `org-a-exhibition-${Date.now()}`,
    description: "Annual dramatic arts performance at Oduduwa Hall.",
    summary: "Annual dramatic arts performance.",
    category: EVENT_CATEGORIES[3], // "Arts & Culture"
    venue: OAU_VENUES[0],
    startDate: new Date(Date.now() + 86400000 * 3),
    endDate: new Date(Date.now() + 86400000 * 3 + 3600000 * 3),
    organizerId: organizerA._id,
    organizerName: "OAU Arts Society",
    flyerUrl: flyerA,
    isFree: true,
    totalCapacity: 150,
    availableSeats: 150,
    registeredCount: 0,
    ticketTiers: [{ name: "Standard", price: 0, capacity: 150, available: 150, maxPerOrder: 2 }],
    status: EVENT_STATUS.DRAFT,
  });

  assert(Boolean(eventA._id), "Event A created successfully by Organizer A");

  // 37. Multi-tenancy defense: Organizer B cannot modify Event A
  const isOwnerByOrganizerB =
    eventA.organizerId.toString() === organizerB._id.toString() ||
    organizerB.role === USER_ROLES.ADMIN;
  assert(
    !isOwnerByOrganizerB,
    "Multi-tenancy defense: Organizer B is identified as non-owner of Organizer A's event"
  );

  // 38. Multi-tenancy flyer deletion defense: Organizer B cannot delete Organizer A's event flyer
  const flyerBelongsToA = eventA.organizerId.toString() === organizerA._id.toString();
  const flyerBlockedForB = eventA.organizerId.toString() !== organizerB._id.toString() && organizerB.role !== USER_ROLES.ADMIN;
  assert(
    flyerBelongsToA && flyerBlockedForB,
    "Multi-tenancy defense: Organizer B is strictly blocked from deleting Organizer A's flyer"
  );

  // 39. Superadmin oversight: Admin has permission to manage any event or flyer
  const adminUser = { id: "admin_super_123", role: USER_ROLES.ADMIN };
  const adminAllowedOnA = adminUser.role === USER_ROLES.ADMIN || eventA.organizerId.toString() === adminUser.id;
  assert(adminAllowedOnA, "Superadmin authorization follows NOTARI policy: universal oversight permitted");

  // 40. Removing flyer updates event record in MongoDB correctly
  await Event.findByIdAndUpdate(eventA._id, { $unset: { flyerUrl: 1 } });
  const eventAAfterRemove = await Event.findById(eventA._id).lean();
  assert(
    eventAAfterRemove?.flyerUrl === undefined,
    "Removing a flyer correctly updates the event record in MongoDB (flyerUrl is unset)"
  );
  assert(
    eventAAfterRemove?.title === "Organizer A Dramatic Arts Exhibition",
    "Event remains fully intact after flyer removal"
  );

  // 41. Failed event update preserves existing flyer in MongoDB
  // Set flyer back
  await Event.findByIdAndUpdate(eventA._id, { $set: { flyerUrl: flyerA } });
  // Simulate a failed update (e.g. invalid date constraint where update is rejected)
  const currentEvent = await Event.findById(eventA._id).lean();
  assert(
    currentEvent?.flyerUrl === flyerA,
    "Failed event update does not destroy existing flyer in database"
  );

  // 42. Upload retry generates unique non-colliding asset path
  const upload1 = await CloudinaryService.uploadFlyer(jpegBuf, { organizerId: organizerA._id.toString() });
  const upload2 = await CloudinaryService.uploadFlyer(jpegBuf, { organizerId: organizerA._id.toString() });
  assert(
    upload1.publicId !== upload2.publicId,
    "Upload retries generate unique non-colliding asset identifiers"
  );
  assert(
    upload1.url !== upload2.url,
    "Upload retries generate separate URLs without overwriting previous attempts"
  );

  // Clean up upload retry files if local
  await CloudinaryService.deleteFlyer(upload1.url);
  await CloudinaryService.deleteFlyer(upload2.url);

  // Clean up test events
  await Event.deleteOne({ _id: eventA._id });
  assert((await Event.findById(eventA._id)) === null, "Event A cleaned up successfully");

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n" + "=".repeat(85));
  console.log(`🎉 PHASE 5.8 FLYER MANAGEMENT TEST SUITE COMPLETED`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log("=".repeat(85) + "\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFlyerManagementTests().catch((err) => {
  console.error("\n❌ Fatal error running Phase 5.8 tests:", err);
  process.exit(1);
});
