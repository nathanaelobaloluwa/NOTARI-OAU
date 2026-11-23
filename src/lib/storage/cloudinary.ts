import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { env } from "@/config/env";
import { validateImageBuffer, extractImageDimensions, AllowedImageType } from "./validation";

export interface FlyerUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  provider: "cloudinary" | "local";
}

/**
 * Cloudinary Media Storage Boundary
 * Handles event flyers, banners, and organizer verification documents.
 * Supports:
 * 1. Cloudinary production CDN signed uploads via REST API
 * 2. Local fallback storage for development and automated tests
 * 3. Secure asset deletion on flyer replacement/removal
 */
export class CloudinaryService {
  private static get cloudName(): string | undefined {
    return process.env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME;
  }

  private static get apiKey(): string | undefined {
    return process.env.CLOUDINARY_API_KEY || env.CLOUDINARY_API_KEY;
  }

  private static get apiSecret(): string | undefined {
    return process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET;
  }

  /**
   * Check if genuine Cloudinary credentials are configured
   */
  public static isConfigured(): boolean {
    const name = this.cloudName?.trim();
    const key = this.apiKey?.trim();
    const secret = this.apiSecret?.trim();

    if (!name || !key || !secret) return false;

    // Filter out dummy/placeholder values
    const lower = name.toLowerCase();
    if (
      lower.includes("dummy") ||
      lower.includes("placeholder") ||
      lower.includes("your_cloud_name") ||
      key.includes("dummy") ||
      secret.includes("dummy")
    ) {
      return false;
    }

    return true;
  }

  /**
   * Upload an event flyer image buffer to storage.
   * Uses Cloudinary if configured; otherwise uses local disk storage in development/test.
   * Throws in production if Cloudinary is not configured.
   */
  public static async uploadFlyer(
    buffer: Buffer,
    options?: {
      organizerId?: string;
      customFilename?: string;
    }
  ): Promise<FlyerUploadResult> {
    // 1. Server-side validation of magic bytes, size, and type
    const validation = validateImageBuffer(buffer);
    if (!validation.valid || !validation.detectedExt || !validation.detectedMime) {
      throw new Error(validation.error || "Invalid image buffer.");
    }

    const { width, height } = extractImageDimensions(buffer);

    // 2. If Cloudinary is configured, upload via Cloudinary REST API
    if (this.isConfigured()) {
      return this.uploadToCloudinary(buffer, validation.detectedMime, {
        width,
        height,
      });
    }

    // 3. In production, unconfigured storage must strictly fail
    const isProduction =
      (process.env.NODE_ENV || env.NODE_ENV) === "production";
    if (isProduction) {
      console.error(
        "🚨 [STORAGE_CONFIG_ERROR] Cloudinary credentials are required in production."
      );
      throw new Error(
        "Media storage is not configured for production. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
      );
    }

    // 4. In development/test mode, fall back to local disk storage
    return this.uploadToLocalStorage(
      buffer,
      validation.detectedExt,
      validation.detectedMime,
      { width, height, organizerId: options?.organizerId }
    );
  }

  /**
   * Cloudinary signed upload using HTTPS REST API (Zero external SDK dependencies)
   */
  private static async uploadToCloudinary(
    buffer: Buffer,
    mimeType: AllowedImageType,
    dimensions: { width?: number; height?: number }
  ): Promise<FlyerUploadResult> {
    const cloudName = this.cloudName!;
    const apiKey = this.apiKey!;
    const apiSecret = this.apiSecret!;

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "notari/flyers";

    // Signed parameters in alphabetical order
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    const formData = new FormData();
    const base64Data = `data:${mimeType};base64,${buffer.toString("base64")}`;
    formData.append("file", base64Data);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", folder);
    formData.append("signature", signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Cloudinary upload error response:", errText);
      throw new Error(`Cloudinary upload failed with status ${response.status}: ${errText}`);
    }

    const data = await response.json();

    return {
      url: data.url,
      secureUrl: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      bytes: data.bytes,
      width: data.width || dimensions.width,
      height: data.height || dimensions.height,
      provider: "cloudinary",
    };
  }

  /**
   * Local filesystem storage for development and automated testing
   */
  private static async uploadToLocalStorage(
    buffer: Buffer,
    ext: "jpg" | "png" | "webp",
    _mimeType: AllowedImageType,
    dimensions: { width?: number; height?: number; organizerId?: string }
  ): Promise<FlyerUploadResult> {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "flyers");
    await fs.mkdir(uploadsDir, { recursive: true });

    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const filename = `flyer_${Date.now()}_${randomSuffix}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/flyers/${filename}`;

    return {
      url: publicUrl,
      secureUrl: publicUrl,
      publicId: filename,
      format: ext,
      bytes: buffer.length,
      width: dimensions.width,
      height: dimensions.height,
      provider: "local",
    };
  }

  /**
   * Delete a stored flyer asset from Cloudinary or local disk
   */
  public static async deleteFlyer(publicIdOrUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!publicIdOrUrl) return { success: false, error: "No asset specified." };

    try {
      // 1. If it's a local file upload (/uploads/flyers/filename.ext)
      if (publicIdOrUrl.startsWith("/uploads/flyers/")) {
        const basename = path.basename(publicIdOrUrl);
        // Ensure no path traversal
        if (basename.includes("..") || basename.includes("/") || basename.includes("\\")) {
          return { success: false, error: "Invalid filename." };
        }
        const filePath = path.join(process.cwd(), "public", "uploads", "flyers", basename);
        try {
          await fs.unlink(filePath);
          return { success: true };
        } catch (err: unknown) {
          if ((err as { code?: string }).code === "ENOENT") {
            return { success: true }; // Already removed
          }
          throw err;
        }
      }

      // 2. If Cloudinary is configured and it's a Cloudinary asset
      if (this.isConfigured()) {
        const cloudName = this.cloudName!;
        const apiKey = this.apiKey!;
        const apiSecret = this.apiSecret!;

        // Extract publicId if a full Cloudinary URL was passed
        let publicId = publicIdOrUrl;
        if (publicIdOrUrl.includes("res.cloudinary.com")) {
          const match = publicIdOrUrl.match(/notari\/flyers\/[^.]+/);
          if (match) {
            publicId = match[0];
          }
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("api_key", apiKey);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);

        const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
        const res = await fetch(destroyUrl, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn("⚠️ Cloudinary destroy returned non-OK status:", errText);
          return { success: false, error: errText };
        }

        return { success: true };
      }

      return { success: true };
    } catch (err) {
      console.warn("⚠️ Error deleting flyer asset:", err);
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Generate an optimized URL for event flyer with responsive transformations
   */
  public static getOptimizedFlyerUrl(publicIdOrUrl: string, width = 800, height = 500): string {
    if (!publicIdOrUrl) return "";
    if (publicIdOrUrl.startsWith("http") && publicIdOrUrl.includes("res.cloudinary.com")) {
      // Inject auto format, auto quality and dimensions if not present
      if (!publicIdOrUrl.includes("f_auto")) {
        return publicIdOrUrl.replace("/upload/", `/upload/c_fill,w_${width},h_${height},f_auto,q_auto/`);
      }
      return publicIdOrUrl;
    }
    if (!publicIdOrUrl.startsWith("http") && this.cloudName && !publicIdOrUrl.startsWith("/")) {
      return `https://res.cloudinary.com/${this.cloudName}/image/upload/c_fill,w_${width},h_${height},f_auto,q_auto/${publicIdOrUrl}`;
    }
    return publicIdOrUrl;
  }
}
