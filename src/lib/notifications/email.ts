import { env } from "@/config/env";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email Notification Boundary
 * Prepared for Resend or transactional SMTP providers
 */
export class EmailService {
  private static apiKey = env.RESEND_API_KEY;
  private static fromEmail = env.EMAIL_FROM;

  public static async sendEmail(params: SendEmailParams): Promise<{ success: boolean; id?: string }> {
    if (!this.apiKey) {
      console.log(`📨 [EMAIL_SIMULATION] To: ${params.to} | Subject: ${params.subject}`);
      return { success: true, id: "simulated_email_id" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });

      const data = await response.json();
      return { success: true, id: data.id };
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      return { success: false };
    }
  }

  /**
   * Helper: Send ticket confirmation email
   */
  public static async sendTicketConfirmation(
    to: string,
    eventTitle: string,
    ticketCode: string
  ): Promise<boolean> {
    const result = await this.sendEmail({
      to,
      subject: `Your Ticket for ${eventTitle} - NOTARI OAU`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Your NOTARI Event Ticket</h2>
          <p>You have successfully registered for <strong>${eventTitle}</strong>.</p>
          <div style="background: #F5F7FC; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748B;">Ticket Code:</p>
            <h3 style="margin: 5px 0; color: #4F46E5; font-family: monospace;">${ticketCode}</h3>
          </div>
          <p>Please present this ticket code or your digital QR pass at the entrance.</p>
        </div>
      `,
    });
    return result.success;
  }
}
