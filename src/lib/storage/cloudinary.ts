import { env } from "@/config/env";

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
}

/**
 * Cloudinary Media Storage Boundary
 * Handles event flyers, banners, and organizer verification documents
 */
export class CloudinaryService {
  private static cloudName = env.CLOUDINARY_CLOUD_NAME;
  private static apiKey = env.CLOUDINARY_API_KEY;

  /**
   * Check if Cloudinary is configured
   */
  public static isConfigured(): boolean {
    return !!(this.cloudName && this.apiKey);
  }

  /**
   * Generate an optimized URL for event flyer with responsive transformations
   */
  public static getOptimizedFlyerUrl(publicIdOrUrl: string, width = 800, height = 500): string {
    if (!publicIdOrUrl.startsWith("http") && this.cloudName) {
      return `https://res.cloudinary.com/${this.cloudName}/image/upload/c_fill,w_${width},h_${height},f_auto,q_auto/${publicIdOrUrl}`;
    }
    return publicIdOrUrl;
  }
}
