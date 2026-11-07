import { Resend } from "resend";
import { env, isResendConfigured } from "@/config/env";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  provider: "resend" | "simulated" | "mock";
  error?: string;
}

// Type for test mock handler
export type EmailMockHandler = (options: SendEmailOptions) => Promise<SendEmailResult>;

let customMockHandler: EmailMockHandler | null = null;

/**
 * Configure a custom mock handler for testing environments.
 * When set, all calls to sendEmail will route to this handler.
 */
export function setEmailMockHandler(handler: EmailMockHandler | null) {
  customMockHandler = handler;
}

/**
 * Singleton Resend instance, initialized lazily when credentials are valid.
 */
let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  if (!isResendConfigured()) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Sends a transactional email using Resend SDK, or safely simulates delivery in development/test.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const recipient = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const fromEmail = options.from || env.EMAIL_FROM;

  // 1. If a test mock handler is registered, delegate to it
  if (customMockHandler) {
    return customMockHandler(options);
  }

  // 2. In test environment without explicit mock, simulate delivery
  if (process.env.NODE_ENV === "test") {
    console.log(`[Email Mock (test)] To: ${recipient} | Subject: "${options.subject}"`);
    return {
      success: true,
      id: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "mock",
    };
  }

  // 3. Check if Resend is configured with a real API key
  const client = getResendClient();

  if (!client) {
    console.log(
      `📧 [Email Simulated (No Resend Key)] To: ${recipient} | Subject: "${options.subject}"`
    );
    return {
      success: true,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "simulated",
    };
  }

  // 4. Dispatch using official Resend SDK
  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error(`❌ Resend API Error [${options.subject}]:`, error.message);
      return {
        success: false,
        provider: "resend",
        error: error.message,
      };
    }

    return {
      success: true,
      id: data?.id,
      provider: "resend",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Failed to send email via Resend to ${recipient}:`, errorMsg);
    return {
      success: false,
      provider: "resend",
      error: errorMsg,
    };
  }
}
