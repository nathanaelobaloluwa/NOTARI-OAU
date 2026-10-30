# NOTARI 2.0 — Obafemi Awolowo University Event Platform

> **Discover Events. Build Your Tomorrow.**  
> The official university event discovery, ticketing, and management platform for **Obafemi Awolowo University (OAU), Ile-Ife, Osun State, Nigeria**.

---

## 🏛️ Project Overview

**NOTARI 2.0** is a completely fresh, modern full-stack web application designed to connect students, university departmental organizations, and platform administrators. Built specifically for the Great Ife campus community, it simplifies event discovery, enables fast paperless ticketing with cryptographically signed QR codes, and provides university event hosts with powerful management tools.

---

## ⚡ Technology Stack

### Core
- **Framework:** Next.js (App Router, Server Actions, Route Handlers)
- **Language:** TypeScript 5
- **UI Library:** React 19, Tailwind CSS v3, shadcn/ui design patterns
- **Icons & Motion:** Lucide React, Framer Motion
- **Typography:** Geist & Geist Mono

### Backend & Data
- **Database:** MongoDB
- **ORM / ODM:** Mongoose (with cached connection pooling for serverless runtimes)
- **Validation:** Zod v3
- **Authentication:** Auth.js (NextAuth v5 beta) with JWT sessions and role-based access control (RBAC)

### Integration Boundaries
- **Payment Processing:** Paystack (NGN currency handling, server-side transaction verification, webhook HMAC-SHA512 verification)
- **Cloud Media Storage:** Cloudinary (event flyer uploads & automated CDN image delivery)
- **QR Code Security:** HMAC-SHA256 signature verification for ticket admission codes
- **Transactional Notifications:** Resend / SMTP email delivery boundary

---

## 🎭 User Roles & Architectural Boundaries

| Role | Target Audience | Primary Capabilities |
|---|---|---|
| **Student** | Great Ife Undergraduates & Postgraduates | Discover campus events, filter by faculty, reserve digital tickets, access QR passes, save events, view booking history, manage student profile. |
| **Organizer** | Accredited Clubs, Faculties & Departmental Committees | Submit events for review, upload flyers, configure ticket tiers & capacities, monitor attendee registrations, scan QR passes at venue gates, view payout balances. |
| **Superadmin** | University Platform Administrators | Platform-wide analytics, review and approve/reject event submissions, accredit organizers, manage student and organizer accounts, broadcast announcements, platform configuration. |

---

## 🗺️ Application Route Foundations

### Public Routes `(public)`
- `/` — Homepage (Hero, search bar with faculty/date filters, featured events, upcoming events, campus promotional banner)
- `/events` — Full searchable and filterable campus events directory
- `/events/[slug]` — Event details, highlights, schedule, and ticket reservation box
- `/about` — Platform mission, campus venues, and community information

### Authentication `(auth)`
- `/login` — Multi-role authentication (Student, Organizer, Admin) with demo shortcuts
- `/register` — Account registration with role selection (Student matric details vs. Organizer organization profile)
- `/forgot-password` — Password recovery flow

### Student Dashboard `/student`
- `/student` — Student overview (Upcoming events, ticket summary cards, quick actions)
- `/student/events` — In-dashboard event discovery
- `/student/tickets` — Digital passes with interactive QR modal & mobile download
- `/student/my-events` — Registered events
- `/student/saved` — Bookmarked events
- `/student/history` — Past event attendance record
- `/student/settings` — Student profile, matriculation number, department, and notification preferences

### Organizer Dashboard `/organizer`
- `/organizer` — Performance dashboard (Sales overview chart, bookings, revenue, quick actions)
- `/organizer/events` — Active and draft events list
- `/organizer/events/create` — 4-step event creation wizard (Basic Info, Ticketing, Media, Review)
- `/organizer/events/[eventId]` — Event management & registration breakdown
- `/organizer/tickets` — Ticket tiers, prices, and capacity limits
- `/organizer/orders` — Real-time ticket order transactions
- `/organizer/attendees` — Registered student roster with gate status
- `/organizer/check-in` — QR code scanner & manual code verification for hall entrance
- `/organizer/payouts` — Paystack revenue disbursement & bank account linking
- `/organizer/analytics` — Conversion rates and faculty demographics
- `/organizer/profile` — Organization accreditation profile

### Superadmin Dashboard `/admin`
- `/admin` — High-level platform statistics, live event & booking chart, category donut breakdown, operational system status panel, recent events, activity feed, top performing events
- `/admin/events` — Platform-wide event management
- `/admin/events/create` — Instant event creation and publishing
- `/admin/events/[eventId]` — Event inspection & flyer management
- `/admin/approvals` — Organizer and event submission approval queue
- `/admin/bookings` — Platform-wide booking ledger
- `/admin/attendees` — Universal student directory
- `/admin/organizers` — Accredited organizer organizations
- `/admin/users` — User account permission management
- `/admin/announcements` — Campus broadcast announcements
- `/admin/analytics` — Platform analytics and CSV export
- `/admin/settings` — System-wide settings and university contact configuration

### API Handlers `/api`
- `/api/health` — Platform status, uptime, and integration readiness check
- `/api/events` — Public event listing with Zod query validation and event creation
- `/api/auth/[...nextauth]` — Auth.js route handler
- `/api/webhooks/paystack` — Paystack server-to-server cryptographic webhook listener

---

## 🎨 Design System

| Purpose | Hex Code | Swatch |
|---|---|---|
| **Primary** | `#4F46E5` | Indigo |
| **Secondary** | `#7C3AED` | Purple |
| **Background** | `#F5F7FC` | Slate Tint |
| **Surface** | `#FFFFFF` | White |
| **Main Text** | `#101C3A` | Navy Black |
| **Success** | `#10B981` | Emerald |
| **Warning** | `#F59E0B` | Amber |
| **Error** | `#EF4444` | Rose |
| **Admin Navy** | `#0B132B` | Deep Navy |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js:** v18.18+ or v20+ (tested on Node v24.20)
- **Package Manager:** npm or pnpm

### 2. Installation
```bash
git clone https://github.com/nathanaelobaloluwa/NOTARI-OAU.git
cd NOTARI-OAU
npm install
```

### 3. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env.local
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Type Checking & Linting
```bash
npm run typecheck
npm run lint
```

---

## 🔒 Security Architecture

1. **Server-Side Authorization:** Never rely on client-side state for sensitive actions. `requireAuth`, `requireRole`, and `checkResourceOwnership` enforce permissions at the route and server action level.
2. **Environment Variable Protection:** Server secrets (`PAYSTACK_SECRET_KEY`, `AUTH_SECRET`, `CLOUDINARY_API_SECRET`, `MONGODB_URI`) are strictly validated using Zod and never exposed to browser bundles.
3. **QR Code Integrity:** Generated ticket codes are paired with HMAC-SHA256 signatures to prevent badge counterfeiting.
4. **Server-Side Payment Verification:** Client-reported transaction success is verified directly against Paystack's REST API or authenticated via webhook signatures before granting tickets.

---

## 📄 License
Private repository for Obafemi Awolowo University (OAU), Ile-Ife. All rights reserved.
