import { renderEmailLayout as renderBaseEmailLayout, renderPlainText } from "./base-layout";

export interface OtpEmailParams {
  name: string;
  email: string;
  otpCode: string;
  expiresMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Renders high-contrast, security-focused 6-digit OTP code block
 */
function renderOtpCodeBox(code: string, expiresMinutes: number): string {
  const digits = code.split("");
  const digitSpans = digits
    .map(
      (d) =>
        `<span style="display: inline-block; width: 44px; height: 52px; line-height: 52px; font-size: 28px; font-weight: 800; font-family: 'Courier New', Courier, monospace; color: #151C35; background-color: #FFFFFF; border: 2px solid #CBD5E1; border-radius: 8px; margin: 0 4px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">${d}</span>`
    )
    .join("");

  return `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B;">
        Your 6-Digit Verification Code
      </p>
      <div style="margin: 0 auto; display: inline-block;">
        ${digitSpans}
      </div>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748B;">
        This code expires in <strong style="color: #0F172A;">${expiresMinutes} minutes</strong>. Single-use only.
      </p>
    </div>
  `;
}

/**
 * 1. Registration Email Verification Template
 */
export function renderRegistrationOtpEmail({
  name,
  otpCode,
  expiresMinutes = 10,
}: OtpEmailParams): { html: string; text: string; subject: string } {
  const subject = `${otpCode} is your NOTARI 2.0 registration verification code`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1E293B;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      Welcome to <strong>NOTARI 2.0</strong>, the official campus event and digital ticketing platform for Obafemi Awolowo University.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      To complete your student account registration and activate your university portal access, please enter the six-digit verification code below:
    </p>

    ${renderOtpCodeBox(otpCode, expiresMinutes)}

    <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.5;">
        <strong>Security Notice:</strong> Never share this verification code with anyone. NOTARI administrators and student union officials will never ask for your code.
      </p>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8;">
      If you did not request this registration, please disregard this email or contact support@notari.oau.edu.ng.
    </p>
  `;

  const html = renderBaseEmailLayout({
    title: "Verify Your Email Address",
    previewText: `Your NOTARI verification code is ${otpCode}. Valid for ${expiresMinutes} minutes.`,
    badge: { text: "Account Registration", variant: "primary" },
    contentHtml,
    footerNote: "Automated account security verification message from NOTARI 2.0 (OAU).",
  });

  const text = renderPlainText({
    title: "NOTARI 2.0 Email Verification",
    leadText: `Hello ${name}, please verify your email address to complete your NOTARI registration.`,
    details: {
      "Verification Code": otpCode,
      Expires: `${expiresMinutes} minutes`,
      "Single-Use": "Yes",
    },
    extraText: "Never share this code with anyone. NOTARI will never ask for your code.",
    footerNote: "If you did not register for NOTARI, please disregard this email.",
  });

  return { html, text, subject };
}

/**
 * 2. Login Two-Factor Authentication OTP Template
 */
export function renderLoginOtpEmail({
  name,
  otpCode,
  expiresMinutes = 10,
  ipAddress,
  userAgent,
}: OtpEmailParams): { html: string; text: string; subject: string } {
  const subject = `${otpCode} is your NOTARI 2.0 sign-in verification code`;

  const detailsHtml =
    ipAddress || userAgent
      ? `
    <div style="margin: 16px 0; padding: 12px 16px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 12px; color: #64748B;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">Sign-in Attempt Details:</p>
      ${ipAddress ? `<p style="margin: 2px 0;">• IP Address: <span style="font-family: monospace; color: #0F172A;">${ipAddress}</span></p>` : ""}
      ${userAgent ? `<p style="margin: 2px 0;">• Device / Browser: <span style="color: #0F172A;">${userAgent}</span></p>` : ""}
      <p style="margin: 2px 0;">• Time: <span style="color: #0F172A;">${new Date().toUTCString()}</span></p>
    </div>`
      : "";

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1E293B;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      A sign-in attempt was initiated for your NOTARI 2.0 university account. Please use the six-digit verification code below to authorize your session:
    </p>

    ${renderOtpCodeBox(otpCode, expiresMinutes)}

    ${detailsHtml}

    <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #991B1B; line-height: 1.5;">
        <strong>Didn't try to log in?</strong> If you did not initiate this login attempt, someone may know your password. Change your password immediately in your account settings or contact NOTARI security.
      </p>
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: "Sign-In Verification Code",
    previewText: `Your login code is ${otpCode}. Valid for ${expiresMinutes} minutes.`,
    badge: { text: "2-Factor Authentication", variant: "warning" },
    contentHtml,
    footerNote: "Automated sign-in security verification message from NOTARI 2.0 (OAU).",
  });

  const text = renderPlainText({
    title: "NOTARI 2.0 Sign-In Verification",
    leadText: `Hello ${name}, a sign-in was attempted on your account.`,
    details: {
      "Verification Code": otpCode,
      Expires: `${expiresMinutes} minutes`,
      ...(ipAddress ? { "IP Address": ipAddress } : {}),
    },
    extraText: "If you did not attempt to log in, please reset your password immediately.",
    footerNote: "Security alert from NOTARI 2.0.",
  });

  return { html, text, subject };
}

/**
 * 3. Password Reset OTP Template
 */
export function renderPasswordResetOtpEmail({
  name,
  otpCode,
  expiresMinutes = 10,
}: OtpEmailParams): { html: string; text: string; subject: string } {
  const subject = `${otpCode} is your NOTARI 2.0 Password Reset code`;

  const contentHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1E293B;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
      We received a request to reset the password for your NOTARI 2.0 account. Please use the six-digit authorization code below:
    </p>

    ${renderOtpCodeBox(otpCode, expiresMinutes)}

    <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.5;">
        <strong>Notice:</strong> This code is single-use and will expire in ${expiresMinutes} minutes. If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: "Reset Your Account Password",
    previewText: `Your password reset code is ${otpCode}. Valid for ${expiresMinutes} minutes.`,
    badge: { text: "Password Recovery", variant: "danger" },
    contentHtml,
    footerNote: "Automated password recovery message from NOTARI 2.0 (OAU).",
  });

  const text = renderPlainText({
    title: "NOTARI 2.0 Password Reset",
    leadText: `Hello ${name}, use this code to reset your account password.`,
    details: {
      "Reset Code": otpCode,
      Expires: `${expiresMinutes} minutes`,
    },
    extraText: "If you did not request this, please disregard.",
    footerNote: "Security notification from NOTARI 2.0.",
  });

  return { html, text, subject };
}
