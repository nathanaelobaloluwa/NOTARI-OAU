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
let cachedApiKey: string | null = null;
let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  if (!isResendConfigured()) {
    return null;
  }
  const currentKey = (process.env.RESEND_API_KEY || env.RESEND_API_KEY || "").trim();
  if (!resendInstance || cachedApiKey !== currentKey) {
    resendInstance = new Resend(currentKey);
    cachedApiKey = currentKey;
  }
  return resendInstance;
}

/**
 * Validates whether an email address format or "Display Name <email>" string is well-formed.
 */
function isValidSenderEmail(from: string): boolean {
  if (!from || from.trim().length < 3) return false;
  const trimmed = from.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("placeholder") ||
    lower.includes("dummy") ||
    lower.includes("your_email") ||
    lower === "undefined" ||
    lower === "null"
  ) {
    return false;
  }
  const displayPattern = /^.+<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return displayPattern.test(trimmed) || emailPattern.test(trimmed);
}

/**
 * Sends a transactional email using Resend SDK, or safely simulates delivery in development/test.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const recipient = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const rawFrom =
    options.from !== undefined
      ? options.from
      : process.env.EMAIL_FROM !== undefined
      ? process.env.EMAIL_FROM
      : env.EMAIL_FROM;
  const fromEmail = rawFrom ? rawFrom.trim() : "";

  // 1. If a test mock handler is registered, delegate to it
  if (customMockHandler) {
    return customMockHandler(options);
  }

  // 2. Sender Identity Validation
  if (!isValidSenderEmail(fromEmail)) {
    const errorMsg =
      "CRITICAL: Missing or invalid sender identity (EMAIL_FROM). Email delivery aborted.";
    console.error(`🚨 [EMAIL_CONFIG_ERROR] ${errorMsg}`);
    return {
      success: false,
      provider: "resend",
      error: errorMsg,
    };
  }

  // 3. In test environment without explicit mock, simulate delivery
  if (process.env.NODE_ENV === "test") {
    console.log(`[Email Mock (test)] To: ${recipient} | Subject: "${options.subject}"`);
    return {
      success: true,
      id: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: "mock",
    };
  }

  // 4. Check if Resend is configured with a real API key
  const client = getResendClient();

  if (!client) {
    // In production, missing or invalid credentials MUST produce a clearly recorded failure and operationally visible error!
    if (process.env.NODE_ENV === "production") {
      const errorMsg =
        "CRITICAL: Missing or invalid RESEND_API_KEY in production environment. Email delivery aborted.";
      console.error(`🚨 [EMAIL_CONFIG_ERROR] ${errorMsg}`);
      return {
        success: false,
        provider: "resend",
        error: errorMsg,
      };
    }

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
      // Auto-fallback for unverified domains to Resend's official testing domain
      if (
        error.message?.includes("is not verified") &&
        !fromEmail.toLowerCase().includes("onboarding@resend.dev")
      ) {
        console.warn(
          `⚠️ [RESEND_UNVERIFIED_DOMAIN]: "${fromEmail}" is unverified. Retrying delivery using "NOTARI OAU <onboarding@resend.dev>"...`
        );
        const retry = await client.emails.send({
          from: "NOTARI OAU <onboarding@resend.dev>",
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
        });

        if (!retry.error) {
          console.log(`✅ [EMAIL_DELIVERED] Sent via onboarding@resend.dev to ${recipient}`);
          return {
            success: true,
            id: retry.data?.id,
            provider: "resend",
          };
        }
      }

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
