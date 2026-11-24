# NOTARI 2.0 — Production Deployment & Operations Guide

This guide details the complete deployment, cloud infrastructure setup, rollback procedures, and post-deployment operational verification for **NOTARI 2.0 (Obafemi Awolowo University Events Discovery & Ticketing Platform)**.

---

## 1. System Architecture & Cloud Dependencies

NOTARI 2.0 is built on the Next.js App Router (v15) and integrates with the following production cloud infrastructure:

```
                          ┌───────────────────────────┐
                          │   Vercel Edge & Cloud     │
                          │   (Next.js App Router)    │
                          └─────────────┬─────────────┘
                                        │
           ┌──────────────────┬─────────┴─────────┬──────────────────┐
           ▼                  ▼                   ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  MongoDB Atlas   │ │  Paystack Engine │ │  Resend Service  │ │ Cloudinary Media │
│   (Replica Set)  │ │ (Card/Bank/USSD) │ │ (Email Delivery) │ │  (Flyers/Assets) │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

1. **Application Runtime**: Vercel (Next.js serverless functions, dynamic SSR routes, static asset caching, Node.js 20.x runtime).
2. **Primary Database**: MongoDB Atlas (Multi-node Replica Set with TLS, replica set connection pooling, and compound indexes).
3. **Payment Processing**: Paystack (NGN card, bank transfer, and USSD payments with HMAC-SHA512 webhook callbacks).
4. **Email Delivery**: Resend (Transactional ticket deliveries, event reminders, and campus announcements via DNS-verified domain).
5. **Media Storage**: Cloudinary (Direct event flyer uploads, image format transformations, and cryptographic deletion signatures).
6. **Background Automation**: Vercel Cron Jobs (15-min event reminders, 10-min announcement publisher, 30-min email retry queue).

---

## 2. Production Environment Variables Reference

Configure these variables in **Vercel Project Settings > Environment Variables**. Never commit production secrets to Git.

| Variable Name | Required | Environment | Description & Security Guidelines |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | Yes | Production | Set to `production`. Activates strict error handling, security headers, and production fail-safes. |
| `NEXT_PUBLIC_APP_URL` | Yes | All | Canonical public domain URL (e.g. `https://notari.oauife.edu.ng`). Used for absolute redirect links and QR verification URLs. |
| `MONGODB_URI` | Yes | All | MongoDB Atlas connection string with replica set, TLS, and connection pooling: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/notari_oau?retryWrites=true&w=majority&maxPoolSize=10`. |
| `AUTH_SECRET` | Yes | All | Cryptographically secure random secret (minimum 32 bytes). Generate via `openssl rand -base64 32`. Signs NextAuth session JWTs. |
| `NEXTAUTH_URL` | Yes | All | Canonical base URL for NextAuth session authentication (e.g. `https://notari.oauife.edu.ng`). |
| `PAYSTACK_SECRET_KEY` | Yes | Staging / Prod | Secret key for backend Paystack API requests. Use `sk_test_...` during testing/pilot; switch to `sk_live_...` only after compliance approval. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Staging / Prod | Public key for frontend Paystack inline checkout modal (`pk_test_...` or `pk_live_...`). |
| `PAYSTACK_CALLBACK_URL` | Yes | All | Payment redirect destination (e.g. `https://notari.oauife.edu.ng/payment/verify`). |
| `CLOUDINARY_CLOUD_NAME` | Yes | All | Cloudinary account cloud name for asset bucket storage. |
| `CLOUDINARY_API_KEY` | Yes | All | Cloudinary API Key for signed upload and transformation requests. |
| `CLOUDINARY_API_SECRET` | Yes | All | Cloudinary API Secret for server-side signature validation and asset deletion. |
| `RESEND_API_KEY` | Yes | Production | Resend production API key (`re_...`) with sending permissions on verified campus domain. |
| `EMAIL_FROM` | Yes | All | Formatted RFC 5322 sender identity (e.g. `NOTARI OAU <notifications@notari.oauife.edu.ng>`). |
| `RESEND_WEBHOOK_SECRET` | Optional | Production | Webhook signature secret from Resend dashboard (`whsec_...`) for inbound delivery/bounce webhooks. |
| `CRON_SECRET` | Yes | Production | Cryptographic secret for authenticating scheduled cron invocations. Generate via `openssl rand -hex 32`. |

---

## 3. External Cloud Dashboard Configuration (Step-by-Step)

### A. Vercel Hosting & CI/CD Pipeline
1. Connect repository `https://github.com/nathanaelobaloluwa/NOTARI-OAU` to Vercel via GitHub integration.
2. Set Framework Preset to **Next.js**.
3. Set Node.js Version to **20.x**.
4. In **Settings > Domains**, attach the production domain: `notari.oauife.edu.ng` (and canonical redirect `www.notari.oauife.edu.ng`).
5. Configure DNS A Record (`76.76.21.21`) or CNAME (`cname.vercel-dns.com`) via the university DNS manager.
6. Populate all Environment Variables listed in Section 2.
7. Confirm that automatic deployment is enabled for branch `main`.

### B. MongoDB Atlas Database Cluster
1. Deploy an Atlas M10+ replica set cluster in an AWS or GCP region with low latency to West Africa (e.g. AWS `eu-west-1` or `af-south-1`).
2. Under **Database Access**, create user `notari_app_prod` with role `readWrite` on database `notari_oau`.
3. Under **Network Access**, add whitelist entry `0.0.0.0/0` (standard for Vercel serverless function IP pooling) secured by SCRAM-SHA-256 and TLS.
4. Ensure the connection URI appends `&maxPoolSize=10` to avoid connection limits when serverless functions autoscale.

### C. Paystack Gateway (Test Mode Initial Staging)
1. In the [Paystack Dashboard](https://dashboard.paystack.com), ensure account is registered for Obafemi Awolowo University campus commerce.
2. Retrieve `Test Secret Key` (`sk_test_...`) and `Test Public Key` (`pk_test_...`).
3. Under **Settings > API Keys & Webhooks**, configure the live webhook endpoint:
   ```
   https://notari.oauife.edu.ng/api/webhooks/paystack
   ```
4. Confirm webhook events subscribe to `charge.success` and `transfer.success`.
5. Under **Preferences**, ensure Settlement Currency is set to **NGN** (Nigerian Naira).

### D. Resend Email Delivery & OAU DNS
1. Add sending domain `notari.oauife.edu.ng` in [Resend Domains](https://resend.com/domains).
2. Coordinate with OAU ICT / Network Center to add the provided DNS records:
   - **DKIM (CNAME)**: `resend._domainkey.notari.oauife.edu.ng`
   - **SPF (TXT)**: `v=spf1 include:amazonses.com ~all`
   - **DMARC (TXT)**: `v=DMARC1; p=none; rua=mailto:dmarc@notari.oauife.edu.ng`
3. Generate an API Key with restricted sending access to the verified domain.
4. *(Optional)* Add inbound webhook endpoint `https://notari.oauife.edu.ng/api/webhooks/resend` for bounce/delivery tracking.

### E. Cloudinary Asset Management
1. In the Cloudinary Console, under **Settings > Upload**, verify upload presets or standard defaults.
2. Ensure image transformations are enabled for JPEG, PNG, and WebP formats.
3. Flyers are stored under `notari/flyers/` with deterministic, tamper-resistant IDs based on event IDs and organizer tokens.

---

## 4. Vercel Cron Jobs Configuration

The repository root includes `vercel.json` defining scheduled background triggers:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/event-reminders",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/scheduled-announcements",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/email-retries",
      "schedule": "0 10 * * *"
    }
  ]
}
```

> **Note on Plan Tiers**: Vercel Hobby accounts enforce a strict frequency limit: cron jobs may only run once per day (e.g. `0 6 * * *`). Upgrading to Vercel Pro enables high-frequency sub-daily expressions (e.g. `*/15 * * * *`). For sub-daily triggers on Hobby tier, an external ping service (e.g. Cron-job.org or GitHub Actions) can target the endpoints with `Authorization: Bearer <CRON_SECRET>`.

Vercel automatically attaches the `Authorization: Bearer <CRON_SECRET>` header to cron requests when `CRON_SECRET` is set in project environment variables. The API endpoints employ constant-time cryptographic token verification (`crypto.timingSafeEqual`) to prevent timing attacks.

---

## 5. Rollback & Incident Recovery Procedures

In the event of an unexpected regression or deployment defect:

### A. Vercel Instant Rollback (Zero Downtime)
1. Open the **Vercel Dashboard > Deployments**.
2. Locate the last known good deployment (e.g. previous stable commit).
3. Click the three dots menu (`...`) and select **Promote to Production** (Instant Rollback).
4. Vercel immediately points production traffic to the previous deployment build within < 5 seconds without triggering a rebuild.

### B. Git Branch Reversion
If an issue requires code modification rather than a simple deployment switch:
1. Revert the problematic commit on branch `main`:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
2. Vercel CI/CD will automatically compile and deploy the revert commit.

### C. MongoDB Atlas Point-in-Time Recovery
If corrupted data requires database restoration:
1. Open **MongoDB Atlas > Clusters > Backup**.
2. Select **Restore** and choose **Point in Time Restore**.
3. Select a timestamp immediately prior to the incident.
4. Restore to a temporary cluster or overwrite the existing cluster after taking a snapshot.

---

## 6. Pre-Flight Verification & Smoke Testing Checklist

Run these steps to confirm deployment health:

- [ ] **Typecheck**: `npm run typecheck` passes with 0 errors.
- [ ] **Lint**: `npm run lint` passes with 0 warnings.
- [ ] **Build**: `npm run build` generates all 86 routes cleanly.
- [ ] **Security Headers**: Verify `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` on `https://notari.oauife.edu.ng`.
- [ ] **Database Connection**: Test `/api/health` returns status `200 OK` with database connected.
- [ ] **Student Journey**:
  - Register student account with `@student.oauife.edu.ng`.
  - Filter events by Faculty of Computing Science and Engineering.
  - Claim a free ticket; verify instant QR pass rendering.
- [ ] **Organizer Journey**:
  - Apply for organizer accreditation from `/student/organizer-apply`.
  - Approve application via Superadmin console (`/admin/approvals`).
  - Create event with flyer upload; check flyer rendering on public catalog.
  - Access `/organizer/check-in` and test camera/scanner initialization.
- [ ] **Admin Journey**:
  - Access `/admin` and confirm live metrics (events, bookings, revenue) render from MongoDB.
  - Inspect `/admin/users` and test search by name and matriculation number.
