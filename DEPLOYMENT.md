# NOTARI 2.0 — Production Deployment Guide

This guide details the deployment procedure for **NOTARI 2.0 (OAU University Events Discovery & Ticketing Platform)**.

---

## 1. Architecture Overview

NOTARI 2.0 is built on the Next.js App Router (v15) and connects to the following production cloud dependencies:

1. **Application Runtime**: Vercel (Next.js Node.js serverless functions & static assets).
2. **Primary Database**: MongoDB Atlas (Replica Set with TLS and Mongoose connection pooling).
3. **Payment Processor**: Paystack (NGN card, bank transfer, and USSD payments with webhook callbacks).
4. **Email Delivery**: Resend (Transactional pass delivery, event reminders, and broadcast announcements via DNS verified domain).
5. **Media Storage**: Cloudinary (Direct event flyer uploads, image transformations, and secure deletions).
6. **Background Automation**: Vercel Cron Jobs (15-min event reminders, 10-min announcement publisher, 30-min email retry queue).

---

## 2. Environment Variables Specification

Configure the following variables in the **Vercel Project Settings > Environment Variables** (or hosting dashboard). Never commit actual production secrets to version control.

| Variable Name | Required | Target Environment | Description & Format |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | Yes | Production | Set to `production` |
| `NEXT_PUBLIC_APP_URL` | Yes | All | Canonical public URL (e.g. `https://notari.oauife.edu.ng`) |
| `MONGODB_URI` | Yes | All | MongoDB Atlas connection string with `maxPoolSize=10` |
| `AUTH_SECRET` | Yes | All | 32-byte cryptographically random string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | All | Exact canonical origin for session redirects |
| `PAYSTACK_SECRET_KEY` | Yes | Production | Paystack live secret key (`sk_live_...`) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Production | Paystack live public key (`pk_live_...`) |
| `PAYSTACK_CALLBACK_URL` | Yes | Production | Verification URL (e.g. `https://notari.oauife.edu.ng/payment/verify`) |
| `CLOUDINARY_CLOUD_NAME` | Yes | All | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Yes | All | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Yes | All | Cloudinary API Secret |
| `RESEND_API_KEY` | Yes | Production | Resend production API key (`re_...`) |
| `EMAIL_FROM` | Yes | All | Verified sender address (e.g. `NOTARI OAU <notifications@notari.oauife.edu.ng>`) |
| `RESEND_WEBHOOK_SECRET` | Optional | Production | Webhook signature secret from Resend dashboard |
| `CRON_SECRET` | Yes | Production | Secret token authenticating scheduled jobs (`openssl rand -hex 32`) |

---

## 3. External Dashboard Configuration (Manual Steps)

### A. MongoDB Atlas
1. Create a production cluster (M10+ recommended for real campus traffic).
2. Set up **Database User** with read/write permissions to `notari_oau` database.
3. Under **Network Access**, add IP whitelist entries or allow `0.0.0.0/0` (secured via strong username/password and TLS).
4. Append `&maxPoolSize=10` to the URI to prevent exhausting Atlas connection limits under serverless function scaling.

### B. Paystack Dashboard
1. Complete Business Compliance & Activation on [Paystack Dashboard](https://dashboard.paystack.com).
2. Retrieve `Live Secret Key` and `Live Public Key` under **Settings > API Keys & Webhooks**.
3. Register the **Live Webhook URL**:
   ```
   https://notari.oauife.edu.ng/api/webhooks/paystack
   ```
4. Verify webhook events include `charge.success` and `transfer.success`.

### C. Resend Dashboard
1. Add and verify the university sending domain (e.g. `notari.oauife.edu.ng`) on [Resend Domains](https://resend.com/domains).
2. Add the required DNS records (DKIM, SPF, and DMARC) with the OAU ICT / Network Center.
3. Generate an API Key with **Sending access** to the verified domain.

### D. Cloudinary Dashboard
1. In Cloudinary Console, under **Settings > Upload**, verify upload presets or default settings.
2. Ensure image transformations are enabled for JPEG/PNG/WebP formats.
3. Flyers are stored under `notari/flyers/` with public IDs derived from organizer event tokens.

---

## 4. Vercel Cron Jobs Configuration

The repository root includes `vercel.json` defining scheduled background triggers:

```json
{
  "crons": [
    {
      "path": "/api/cron/event-reminders",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/scheduled-announcements",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/email-retries",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Vercel automatically attaches the `Authorization: Bearer <CRON_SECRET>` header to cron requests when `CRON_SECRET` is set in project environment variables.

---

## 5. Pre-Deployment Verification Checklist

Before opening the platform to testers:

- [ ] Run full typecheck: `npm run typecheck` (0 errors).
- [ ] Run linter: `npm run lint` (0 warnings).
- [ ] Run production build: `npm run build` (Exits code 0).
- [ ] Run all platform test suites: `npx tsx src/scripts/test-phase-5-10-performance.ts` (100% passing).
- [ ] Confirm database indexes exist (`Event`, `Booking`, `Ticket`, `Announcement`).
- [ ] Confirm Paystack is in Test mode for initial staging verification.
- [ ] Confirm `SEED_*` variables are removed or disabled in production.
- [ ] Confirm security headers are active (HSTS, CSP, X-Frame-Options).

---

## 6. Post-Deployment Verification

1. **Student Journey**:
   - Register a new student account with an `@oauife.edu.ng` email.
   - Verify immediate login and redirection to `/student`.
   - Browse events catalog, filter by Faculty of Computing Science and Engineering.
   - Claim a free event pass; verify instant ticket generation and QR display.
2. **Organizer Journey**:
   - Submit organizer accreditation application from `/student/organizer-apply`.
   - Log in as Superadmin at `/admin/approvals` and approve the application.
   - Verify organizer status badge and access to `/organizer`.
   - Create an event with flyer upload, set ticket tiers.
   - Access check-in console at `/organizer/check-in` and test scanning.
3. **Admin Journey**:
   - Access `/admin` and confirm real database metrics render without mock data.
   - Review `/admin/users` and verify user directory search and status controls.
