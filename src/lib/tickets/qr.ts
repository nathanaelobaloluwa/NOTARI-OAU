import crypto from "crypto";

export interface TicketVerificationPayload {
  ticketCode: string;
  eventId: string;
  userId: string;
  tierName: string;
  signature: string;
}

/**
 * QR Code Generation & Ticket Verification Service Boundary
 */
export class TicketSecurityService {
  private static secret = process.env.AUTH_SECRET || "notari_ticket_signing_secret";

  /**
   * Generates a unique, high-entropy ticket code e.g. "NOT-OAU-8F32K9A1C4E7"
   */
  public static generateTicketCode(): string {
    const randomHex = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `NOT-OAU-${randomHex}`;
  }

  /**
   * Generates a secure HMAC signature for a ticket to prevent forgery
   */
  public static signTicket(ticketCode: string, eventId: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(`${ticketCode}:${eventId}`)
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Verifies the HMAC signature of a scanned ticket payload
   * Guarded against buffer-length mismatches to prevent RangeError crashes.
   */
  public static verifyTicketSignature(
    ticketCode: string,
    eventId: string,
    signature: string
  ): boolean {
    if (!signature || typeof signature !== "string") {
      return false;
    }

    const expected = this.signTicket(ticketCode, eventId);
    const signatureBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expected, "utf-8");

    if (signatureBuffer.byteLength !== expectedBuffer.byteLength) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  /**
   * Generates a compact JSON string encoded inside the ticket's QR code.
   */
  public static generateQRPayload(ticketCode: string, eventId: string): string {
    const signature = this.signTicket(ticketCode, eventId);
    return JSON.stringify({
      code: ticketCode,
      eventId,
      sig: signature,
    });
  }

  /**
   * Safely parses raw text scanned from camera QR codes.
   * Handles JSON payloads, URL links with query parameters, or bare ticket codes.
   */
  public static parseScannedPayload(rawText: string): {
    ticketCode: string;
    eventId?: string;
    signature?: string;
  } {
    const trimmed = (rawText || "").trim();

    // 1. Try parsing JSON format
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        const ticketCode = String(parsed.code || parsed.ticketCode || "").toUpperCase().trim();
        const eventId = parsed.eventId ? String(parsed.eventId).trim() : undefined;
        const signature = parsed.sig || parsed.signature ? String(parsed.sig || parsed.signature).trim() : undefined;
        if (ticketCode) {
          return { ticketCode, eventId, signature };
        }
      } catch {
        // Fall through
      }
    }

    // 2. Try parsing URL format: https://.../verify/NOT-OAU-...?sig=...&eventId=...
    if (trimmed.includes("http://") || trimmed.includes("https://")) {
      try {
        const url = new URL(trimmed);
        const pathSegments = url.pathname.split("/").filter(Boolean);
        const ticketCode = (pathSegments[pathSegments.length - 1] || "").toUpperCase().trim();
        const signature = url.searchParams.get("sig") || undefined;
        const eventId = url.searchParams.get("eventId") || undefined;
        if (ticketCode.startsWith("NOT-")) {
          return { ticketCode, eventId, signature };
        }
      } catch {
        // Fall through
      }
    }

    // 3. Fallback: treat as bare ticket code
    return {
      ticketCode: trimmed.toUpperCase(),
    };
  }
}
