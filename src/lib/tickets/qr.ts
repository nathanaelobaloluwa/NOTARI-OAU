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
   * Generates a unique, human-readable ticket code e.g. "NOT-OAU-8F32K"
   */
  public static generateTicketCode(): string {
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
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
   */
  public static verifyTicketSignature(
    ticketCode: string,
    eventId: string,
    signature: string
  ): boolean {
    const expected = this.signTicket(ticketCode, eventId);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}
