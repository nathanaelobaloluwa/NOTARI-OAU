export interface EmailBadge {
  text: string;
  variant?: "primary" | "success" | "warning" | "danger" | "neutral";
}

export interface EmailCta {
  label: string;
  url: string;
  variant?: "primary" | "secondary";
}

export interface EmailKeyValuePair {
  label: string;
  value: string;
}

export interface EmailAlert {
  type: "info" | "success" | "warning" | "danger";
  message: string;
}

export interface BaseLayoutOptions {
  title: string;
  previewText?: string;
  badge?: EmailBadge;
  leadText?: string;
  contentHtml: string;
  keyValues?: EmailKeyValuePair[];
  alert?: EmailAlert;
  cta?: EmailCta;
  secondaryCta?: EmailCta;
  footerNote?: string;
}

const BADGE_COLORS = {
  primary: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
  success: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  warning: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  danger: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
  neutral: { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" },
};

const ALERT_COLORS = {
  info: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  success: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  warning: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  danger: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
};

/**
 * Renders key-value data table for transactional receipts and ticket details.
 */
export function renderKeyValueTable(pairs: EmailKeyValuePair[]): string {
  if (!pairs || pairs.length === 0) return "";

  const rows = pairs
    .map(
      (pair, index) => `
      <tr style="border-bottom: ${index === pairs.length - 1 ? "none" : "1px solid #E2E8F0"};">
        <td style="padding: 10px 12px; font-size: 13px; color: #64748B; font-weight: 500; vertical-align: top; width: 40%;">
          ${pair.label}
        </td>
        <td style="padding: 10px 12px; font-size: 13px; color: #0F172A; font-weight: 600; text-align: right; vertical-align: top; width: 60%;">
          ${pair.value}
        </td>
      </tr>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 18px 0; border-collapse: separate;">
      ${rows}
    </table>`;
}

/**
 * Renders an alert callout box.
 */
export function renderAlertBox(alert: EmailAlert): string {
  const colors = ALERT_COLORS[alert.type] || ALERT_COLORS.info;
  return `
    <div style="background-color: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 14px 16px; margin: 18px 0; color: ${colors.text}; font-size: 13px; line-height: 1.5;">
      ${alert.message}
    </div>`;
}

/**
 * Renders a bulletproof email button.
 */
export function renderCtaButton(cta: EmailCta): string {
  const isSecondary = cta.variant === "secondary";
  const bg = isSecondary ? "#F1F5F9" : "#4169E1";
  const text = isSecondary ? "#151C35" : "#FFFFFF";
  const border = isSecondary ? "1px solid #CBD5E1" : "1px solid #3358C8";

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-block; margin: 16px 0;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: ${bg}; border: ${border};">
          <a href="${cta.url}" target="_blank" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: ${text}; text-decoration: none; border-radius: 8px;">
            ${cta.label} &rarr;
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Generates mobile-responsive, university-branded transactional HTML emails.
 */
export function renderEmailLayout(options: BaseLayoutOptions): string {
  const preview = options.previewText || options.title;

  const badgeHtml = options.badge
    ? (() => {
        const c = BADGE_COLORS[options.badge.variant || "primary"];
        return `
        <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border}; border-radius: 9999px; padding: 4px 12px; margin-bottom: 12px;">
          ${options.badge.text}
        </span>`;
      })()
    : "";

  const leadHtml = options.leadText
    ? `<p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">${options.leadText}</p>`
    : "";

  const kvHtml = options.keyValues ? renderKeyValueTable(options.keyValues) : "";
  const alertHtml = options.alert ? renderAlertBox(options.alert) : "";
  const ctaHtml = options.cta ? renderCtaButton(options.cta) : "";
  const secondaryCtaHtml = options.secondaryCta ? renderCtaButton(options.secondaryCta) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F8FAFC; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .content-cell { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Hidden Preheader Preview Text -->
  <div style="display: none; font-size: 1px; color: #F8FAFC; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preview}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" class="email-container" width="580" cellpadding="0" cellspacing="0" style="width: 580px; max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #151C35; padding: 24px 28px; text-align: left; border-bottom: 3px solid #4169E1;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.04em;">
                      NOTARI<span style="color: #20BFA9;"> 2.0</span>
                    </span>
                    <div style="font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px;">
                      Obafemi Awolowo University &bull; Great Ife
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-cell" style="padding: 32px 28px; background-color: #FFFFFF;">
              ${badgeHtml}
              <h1 style="font-size: 20px; font-weight: 800; color: #0F172A; margin: 0 0 14px 0; line-height: 1.3; letter-spacing: -0.01em;">
                ${options.title}
              </h1>

              ${leadHtml}
              
              <div style="font-size: 14px; color: #334155; line-height: 1.6;">
                ${options.contentHtml}
              </div>

              ${kvHtml}
              ${alertHtml}

              <!-- CTAs -->
              <div style="margin-top: 24px;">
                ${ctaHtml}
                ${secondaryCtaHtml}
              </div>
            </td>
          </tr>

          <!-- University Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 24px 28px; text-align: center; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #475569;">
                NOTARI 2.0 &bull; OAU Campus Event & Ticketing Infrastructure
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #64748B; line-height: 1.4;">
                Obafemi Awolowo University, Ile-Ife, Osun State, Nigeria<br>
                For support, contact <a href="mailto:support@notari.oau.edu.ng" style="color: #4F46E5; text-decoration: underline;">support@notari.oau.edu.ng</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #94A3B8; line-height: 1.4;">
                ${options.footerNote || "This is an automated transactional message regarding your NOTARI 2.0 account or tickets. Please do not reply directly to this email."}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface PlainTextOptions {
  title: string;
  leadText?: string;
  details?: Record<string, string>;
  ctaLabel?: string;
  ctaUrl?: string;
  extraText?: string;
  footerNote?: string;
}

/**
 * Generates corresponding plain-text email representation.
 */
export function renderPlainText(options: PlainTextOptions): string {
  const divider = "============================================================";
  const subDivider = "------------------------------------------------------------";

  const lines: string[] = [
    divider,
    "NOTARI 2.0 • Obafemi Awolowo University",
    divider,
    "",
    options.title.toUpperCase(),
    subDivider,
  ];

  if (options.leadText) {
    lines.push("", options.leadText);
  }

  if (options.details && Object.keys(options.details).length > 0) {
    lines.push("", "TRANSACTION / EVENT DETAILS:");
    for (const [key, val] of Object.entries(options.details)) {
      lines.push(`• ${key}: ${val}`);
    }
  }

  if (options.extraText) {
    lines.push("", options.extraText);
  }

  if (options.ctaLabel && options.ctaUrl) {
    lines.push("", `${options.ctaLabel}: ${options.ctaUrl}`);
  }

  lines.push(
    "",
    subDivider,
    "Obafemi Awolowo University, Ile-Ife, Osun State, Nigeria",
    "Support: support@notari.oau.edu.ng",
    options.footerNote || "This is an automated transactional notification from NOTARI 2.0.",
    divider
  );

  return lines.join("\n");
}
