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
}
