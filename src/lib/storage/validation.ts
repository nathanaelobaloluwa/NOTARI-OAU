/**
 * NOTARI 2.0 — Flyer Image Validation Utilities
 * Validates MIME types, file sizes, and genuine binary magic numbers (file signatures)
 * to prevent extension spoofing (e.g. executable or malicious HTML renamed as .png/.jpg).
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_FLYER_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: AllowedImageType;
  detectedExt?: "jpg" | "png" | "webp";
}

/**
 * Validates a file buffer against binary magic signatures.
 * Does not trust the client-provided header alone.
 */
export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file provided." };
  }

  if (buffer.length > MAX_FLYER_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 5 MB.`,
    };
  }

  // Minimum header size to inspect signatures
  if (buffer.length < 12) {
    return { valid: false, error: "File too small to be a valid image." };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg", detectedExt: "jpg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png", detectedExt: "png" };
  }

  // 3. WebP: "RIFF" (bytes 0-3) and "WEBP" (bytes 8-11)
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  if (isRiff && isWebp) {
    return { valid: true, detectedMime: "image/webp", detectedExt: "webp" };
  }

  // Reject all other signatures (including SVG, GIF, BMP, executables, scripts)
  return {
    valid: false,
    error:
      "Unsupported file format. Please upload a genuine JPEG, PNG, or WebP image. SVG or executable files are not permitted.",
  };
}

/**
 * Extracts approximate dimensions from standard JPEG, PNG, and WebP headers without heavy external libraries.
 */
export function extractImageDimensions(
  buffer: Buffer
): { width?: number; height?: number } {
  try {
    // PNG: Dimensions are 32-bit big-endian integers at offsets 16 and 20 in the IHDR chunk
    if (
      buffer.length >= 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // JPEG: Scan for SOF0/SOF2 marker (0xFF, 0xC0 or 0xFF, 0xC2)
    if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // Baseline SOF0 (0xC0) or Progressive SOF2 (0xC2)
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    // WebP: VP8 / VP8L / VP8X chunk scanning
    if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF") {
      const format = buffer.toString("ascii", 12, 16);
      if (format === "VP8X") {
        // Extended format
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height };
      }
    }
  } catch (err) {
    console.warn("⚠️ Could not extract image dimensions from buffer header:", err);
  }

  return {};
}
