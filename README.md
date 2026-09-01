# 🏰 VenueOS (V1.0.1) — Modern Banquet Hall Operations & Lead CRM SaaS

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0.9-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Automated_Tests-85%2F85_Passing-success?style=flat-square)](scripts/)
[![Release](https://img.shields.io/badge/Release-v1.0.1-brightgreen?style=flat-square)](https://github.com/vibecoderakash/VenueOS/releases/tag/v1.0.1)
[![License](https://img.shields.io/badge/License-MIT-orange?style=flat-square)](LICENSE)

> **VenueOS** is a multi-tenant, cloud-native Banquet Hall & Event Venue Management SaaS designed to streamline inquiry capture, pipeline progression, loss-reason analytics, staff collaboration, and floor operations.
> 
> *"Open the lead. Understand the customer. Know the next action."*

---

## 🛠️ Tech Stack & Specifications (Stable & LTS)

| Layer | Technology | Version | Purpose / Details |
| :--- | :--- | :--- | :--- |
| **Runtime / Engine** | **Node.js** | `>= 18.18.0` (LTS 20.x / 22.x recommended) | Server execution environment |
| **Core Framework** | **Next.js (App Router)** | `^16.3.4` (Patched, CVE-free) | Full-stack React framework with SSR, API routes & Turbopack |
| **UI Library** | **React** | `^19.0.0` | Concurrent React architecture |
| **Language** | **TypeScript** | `^5.7.3` | Strict static typing across models, API contracts & validations |
| **Styling & Design** | **Tailwind CSS** | `^4.0.9` | High-performance CSS engine with custom luxury theme tokens |
| **Icons** | **Lucide React** | `^1.16.0` | Crisp SVG icon library |
| **Database & Auth** | **Supabase (PostgreSQL 15+)** | `@supabase/ssr ^0.5.2`, `@supabase/supabase-js ^2.49.1` | Multi-tenant PostgreSQL with Row-Level Security (RLS) & Auth |
| **Data Validation** | **Zod** | `^3.24.2` | Runtime schema validation & API boundary sanitation |
| **Dates & Timing** | **date-fns** | `^4.1.0` | Immutable date manipulation and countdown calculation |
| **FX & Micro-Interactions** | **Canvas Confetti** | `^1.9.4` | Particle celebration animations on converted bookings |
| **Animations** | **Framer Motion** | `^12.4.7` | Smooth layout transitions and slide-over panels |

---

## ✨ VenueOS V1 Feature Matrix

### 1. 🏰 Multi-Tenant Setup & Security
- **Atomic Owner Setup (`/setup`):** Self-serve initial organization registration with rollback protection and email verification notices.
- **Tenant Data Isolation:** Row-Level Security (RLS) verified across all PostgreSQL tables (`organizations`, `profiles`, `leads`, `lead_discussions`, `lead_activity`, `lead_assignment_history`, `system_audit_logs`).
- **Privacy-Preserving Setup RPC:** `public.check_has_owner()` prevents PII leakage to unauthenticated visitors.
- **Admin Isolation:** Supabase service-role keys are strictly encapsulated server-side (`lib/supabase/admin.ts`).

### 2. 📋 Banquet Lead Pipeline & CRM Engine
- **Banquet Form Validations:** Exact 10-digit Indian phone normalization, duplicate phone detection, flexible Event Dates (`Fixed Date` vs `Not Fixed`), and flexible Guest Count (`Fixed Pax` vs `Not Fixed`).
- **5-at-a-Time Infinite Scroll:** High-performance cursor pagination with debounced live search, skeleton loading states, and race-condition prevention.
- **Pipeline Stage Progression:** `New` ➔ `Contacted` ➔ `Interested` ➔ `Follow-up` ➔ `Converted` / `Lost`.
- **Celebratory Conversion:** Interactive full-screen confetti animation upon winning a banquet booking.

### 3. 🏷️ Custom Lead Tags & Loss Reason Intelligence
- **Loss Reason Capture Modal:** Intercepts `Lost` status changes to capture root cause (*Budget Issue, Date Unavailable, Booked Competitor, Cancelled Plan, Unresponsive / Cold, Other*) with optional notes.
- **Custom Banquet Tags:** 1-tap quick pills (*VIP Client, High Budget, Lawn Preference, Pure Veg, Grand Ballroom, AC Hall Required, DJ Setup, Rooms Required*) + custom free-form tag creator.
- **Multi-Dimension Filters:** Filter leads by Status, Priority, Assigned Rep, Source, Event Type, Follow-up urgency, Custom Tag, and Loss Reason.

### 4. 👥 Team Management & Granular Permissions
- **3-Tier Role Hierarchy:** `Owner`, `Manager`, and `Staff`.
- **Direct Staff Provisioning:** Immediate credential generation with mandatory password policy (no email delivery blockers).
- **Inactive User Enforcement:** Deactivated team members are locked into read-only access with `403 FORBIDDEN_DEACTIVATED` protection.
- **Lead Assignment:** Atomic lead reassignment with complete historical assignment audit trail.

### 5. 💬 Discussion Notes & Immutable Audit Trail
- **Threaded Customer Notes:** Real-time team collaboration notes with inline edit and delete capabilities.
- **System Activity Log:** Every status progression, priority change, follow-up reschedule, and loss reason is permanently recorded.

### 6. 📱 Mobile & Tablet UI/UX Polish
- **Mobile Bottom Navigation Bar:** Dedicated 1-thumb touch navigation on mobile screens (`< 768px`) with live badge counters.
- **Bottom-Sheet Modals:** Create Lead and detail modals smoothly open as bottom sheets on smartphones with sticky bottom action bars.
- **iOS Safari Polish:** Input fields set to $16\text{px}$ font size to prevent automatic browser zoom.

### 7. 📊 Reports & Conversion Intelligence (`/reports`)
- **Key Metrics:** Conversion Win Rate %, Follow-up Adherence %, and Active Pipeline counts.
- **Sales Rep Leaderboard:** Active inquiries, confirmed bookings, and adherence rates per team member.
- **Marketing Channel Attribution:** Inquiries vs Bookings per acquisition source (*Meta, Google, WhatsApp, Walk-in, Referral, etc.*).
- **Lost Inquiries Breakdown:** Visual breakdown of why bookings were lost to guide banquet pricing and marketing strategy.

---

## 🧪 Verification & Automated Test Suites

VenueOS includes **85 automated tests** across 6 dedicated test suites:

```bash
# Run all 85 automated test suites
npm test

# Run End-to-End Security & Workflow Suite
npm run test:e2e

# Run TypeScript type check
npx tsc --noEmit

# Run Next.js production build
npm run build
```

### Test Suite Breakdown:

| Test Suite | File | Tests Passed | Status |
| :--- | :--- | :---: | :---: |
| **Lead Pagination & Filtering** | `scripts/test-pagination.mjs` | **14 / 14** | ✅ PASS |
| **Password Recovery Flow** | `scripts/test-recovery.mjs` | **6 / 6** | ✅ PASS |
| **Banquet Form Validation & Tags** | `scripts/test-leads.mjs` | **26 / 26** | ✅ PASS |
| **API Boundary & Security Rules** | `scripts/test-api.mjs` | **13 / 13** | ✅ PASS |
| **RLS, Error Codes & Inactive Guards**| `scripts/test-security.mjs` | **11 / 11** | ✅ PASS |
| **End-to-End Workflow & Diagnostics**| `scripts/test-e2e.mjs` | **15 / 15** | ✅ PASS |
| **TOTAL** | `npm test` | **85 / 85** | 🟢 **100% PASS** |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `>= 18.18.0` (LTS 20.x or 22.x recommended)
- **npm** or **pnpm** / **yarn**
- **Supabase Account & Project**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/vibecoderakash/VenueOS.git
cd VenueOS
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Database Migrations
Run the SQL migration scripts located in `supabase/migrations/` inside your Supabase SQL Editor:
1. `supabase/schema.sql` (Base tables, RLS policies, trigger functions)
2. `supabase/migrations/20260901_lead_tags_and_loss_reasons.sql` (Custom tags and loss reason columns)

### 4. Start Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Production Deployment

### Deploying to Netlify
1. Connect your GitHub repository (`vibecoderakash/VenueOS`) in Netlify.
2. Set Build Command: `npm run build`
3. Set Publish Directory: `.next`
4. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in **Site Settings ➔ Environment variables**.
5. Trigger deploy!

### Deploying to Vercel
1. Import `VenueOS` repository into Vercel.
2. Framework Preset: **Next.js**.
3. Add environment variables.
4. Deploy!

---

## 🗺️ Upcoming VenueOS V2 Roadmap
- 📅 **Banquet Bookings & Slot Calendar:** Date/time slot locking, Hall availability calendar, double-booking prevention.
- 📋 **Function Sheets & Banquet Event Orders (BEO):** Food menu selection, decor specs, audio/visual requirements, itinerary timeline.
- 📄 **Quotation & PDF Generator:** Custom package builder, quotation generation, and 1-click printable PDF.
- 💳 **Advance Payments & Billing:** Token advances, milestone payment tracking, GST invoices, and receipts.
- 👨‍🍳 **Floor & Kitchen Operations:** Live operational dashboards for kitchen staff and floor managers.

---

## 📄 License
MIT License © 2026 VenueOS. Built for modern banquet hall operators.
