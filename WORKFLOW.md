# 🏛️ VenueOS Architecture, Navigation & Engineering Workflow

> **Current Version:** `v1.0.4`  
> **Status:** Active Evolution (V1 Complete & Hardened / V2 Planning)  
> **Framework:** Next.js 16 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4, Supabase SSR

---

## 1. 🌐 Next.js App Router Navigation Architecture

VenueOS is structured as a **Single Page Application (SPA)** on top of the Next.js App Router.

### 1.1 Persistent Root Shell
- **Root Layout (`app/layout.tsx`):** Mounts `ThemeProvider` ➔ `AuthProvider` ➔ `DataProvider` ➔ `AppShell` ➔ `{children}`.
- **Component Mount Lifecycle:** The `<Sidebar>`, `<Header>`, and `<MobileBottomNav>` components live inside `<AppShell>` and **remain permanently mounted** during internal page transitions.
- **Zero Full-Page Reloads:**
  - Tab switching between `/`, `/leads`, `/reports`, `/settings`, and `/leads/[id]` uses Next.js `<Link>` and `router.push()` / `router.replace()`.
  - Normal internal navigation generates **0 HTML Document requests** and executes **0 `window.location.reload()`** calls.
  - Hard browser navigation (`window.location.replace()`) is strictly reserved for user sign-in and sign-out to guarantee security boundary isolation and cookie cache purging.

---

## 2. ⚡ DataProvider & State Management Lifecycle

### 2.1 Single-Fetch Authentication Mount
- **Location:** `lib/data-context.tsx`
- **Lifecycle:** When an authenticated profile is resolved, `DataProvider` issues a single parallel batch query to Supabase:
  1. `organizations` (Current venue profile & branding)
  2. `profiles` (Active team members)
  3. `leads` (Initial inquiries dataset for KPI calculations)
  4. `lead_discussions` (Customer discussion threads)
  5. `lead_activity` (Audit logs)
- **Decoupled Pathname:** `pathname` is intentionally omitted from the `DataProvider` `useEffect` dependencies. Navigating between routes does **not** trigger redundant Supabase query storms.

### 2.2 Optimistic In-Memory Mutations
- Status updates, priority changes, follow-up schedules, and discussion additions update React state **instantaneously (0ms latency)** with optimistic rollbacks on network failure.
- Background asynchronous writes persist changes to Supabase PostgreSQL.

### 2.3 Paginated Lead Inbox
- **Location:** `app/leads/page.tsx`
- **Engine:** 5-at-a-time cursor pagination via `GET /api/leads` with debounced search (300ms) and `IntersectionObserver` infinite scrolling.
- **Filter Reactivity:** The `fetchLeads` `useCallback` dependency array explicitly tracks all filtering dimensions:
  - `status`, `priority`, `ownerId`, `source`, `eventType`, `filters.tag`, `filters.lossReason`, `followUpState`, `showArchived`, `sortBy`, `sortOrder`.

### 2.4 Cold-Load Race Protection
- **Location:** `app/leads/[id]/page.tsx`
- **Skeleton State:** Renders an animated pulse skeleton while `isLoading && !lead`.
- **Not Found State:** Displays "Lead Not Found" **only after** `isLoading === false` and the lead record is confirmed non-existent.

### 2.5 Settings Organization-State Lifecycle & Profile Anti-Demotion
- **Location:** `lib/auth-context.tsx`, `lib/data-context.tsx`, `app/settings/page.tsx`
- **Profile Anti-Demotion (`auth-context.tsx`):** On Supabase `TOKEN_REFRESHED` or browser tab visibility change, `handleSession()` preserves the existing database-backed profile with `profileRef`, preventing temporary overwrites with incomplete auth metadata.
- **DataProvider State Preservation (`data-context.tsx`):** `loadFromSupabase()` preserves in-memory organization state during background auth revalidations, resetting to `EMPTY_ORGANIZATION` only on genuine logout (`!authIsAuthenticated`).
- **Settings Skeleton (`settings/page.tsx`):** Renders an animated luxury skeleton card while `isLoading && !organization.id`, preventing false "No venue connected" displays.

---

## 3. 🔒 Core Architectural Principles & Boundaries

### 3.1 Supabase as Single Source of Truth
- Supabase PostgreSQL with Row-Level Security (RLS) is the sole authoritative store for all business data.
- **Strictly Prohibited:** Creating LocalStorage or in-browser fallbacks for leads, inquiries, discussions, activity logs, staff, or organizations.

### 3.2 LocalStorage Policy
- **Allowed:** Non-sensitive UI layout preferences only:
  - `venue_os_theme` (`"light"` | `"dark"` | `"system"`)
  - `venue_os_sidebar_collapsed` (`"true"` | `"false"`)
- **Prohibited:** Any business data, tenant IDs, tokens, or customer PII.

### 3.3 Multi-Tenant Isolation & Auth Derivation
- `organization_id` is always derived on the server from the authenticated user's session token (`auth.uid()`). Client-supplied tenant IDs are never trusted as authorization.
- Inactive accounts (`is_active === false`) are strictly enforced as read-only via `403 FORBIDDEN_DEACTIVATED`.

---

## 4. 🧪 Automated Quality & Test Verification

All builds and pull requests must pass the comprehensive automated test suite:

```bash
# Run all 85 automated tests
npm test

# Run TypeScript strict typecheck
npx tsc --noEmit

# Run E2E Security & Workflow Suite
npm run test:e2e
```

### Current Test Verification Matrix:
- **TypeScript:** `0 errors` (`npx tsc --noEmit` exits 0)
- **`npm test` Results:** `85 passed, 0 failed` across 6 test suites:
  - `scripts/test-pagination.mjs`: 14 / 14 ✅
  - `scripts/test-recovery.mjs`: 6 / 6 ✅
  - `scripts/test-leads.mjs`: 26 / 26 ✅
  - `scripts/test-api.mjs`: 13 / 13 ✅
  - `scripts/test-security.mjs`: 11 / 11 ✅
  - `scripts/test-e2e.mjs`: 15 / 15 ✅

---

## 5. 🛠️ Development & Git Release Rules (Rule 13)

1. **Branch Workflow (`main` & `development`):**
   - `main`: Protected production branch. Deploys to Netlify Production. Direct pushes blocked.
   - `development`: Active feature and bugfix branch. Deploys to Netlify Branch Preview.
   - All production releases occur through a validated **Pull Request (`development` ➔ `main`)**.
2. **Inspect Before Changing:** Always inspect existing code paths, API boundaries, and schemas before editing.
3. **Never Auto-Push:** Do not push code to GitHub without explicit user instruction and confirmation.
4. **Semantic Versioning Management:** The AI automatically calculates, tracks, and manages version numbers (`v1.0.1` ➔ `v1.0.2` ➔ `v1.0.3` ➔ `v1.0.4` ➔ `v2.0.0`).
5. **Clean Commits & Guardrails:** Full engineering protocols are codified in [`GUARDRAILS.md`](file:///c:/Users/akash/Desktop/AI%20Builder/VenueOS/GUARDRAILS.md).

---

## 6. 🗺️ Project Status & Roadmap

### ✅ Completed V1 Deliverables (Delivered)
- Multi-Tenant Atomic Setup & Privacy-Preserving RPC
- Row-Level Security (RLS) across all PostgreSQL tables
- Banquet Inquiry CRM Pipeline with 10-digit Indian phone normalization
- 5-at-a-time Cursor Pagination with debounced live search
- Custom Banquet Tags & Loss Reason Intelligence
- 3-Tier Team Management (`Owner`, `Manager`, `Staff`) with direct provisioning
- Discussion History & Immutable Audit Timeline
- Mobile Bottom Navigation Bar & Responsive Bottom Sheets
- System Health Diagnostics & Danger Zone Cascaded Deletion
- Conversion Win Rates, Adherence & Sales Rep Leaderboards
- Venue Profile Picture Uploader with WebP compression
- 0-Reload Next.js App Router Navigation & Cold-Load Skeleton Loaders
- Triple-Size 3D Loading Screen Logo ($192px) with Luxury Ambient Glow

### 🚀 Upcoming VenueOS V2 Roadmap (Planned Work)
1. **Banquet Bookings & Slot Calendar:** Date/time slot locking, Hall availability calendar, double-booking prevention.
2. **Function Sheets & Banquet Event Orders (BEO):** Food menu selection, decor specs, audio/visual requirements, itinerary timeline.
3. **Quotation & PDF Generator:** Custom package builder, quotation generation, and 1-click printable PDF.
4. **Advance Payments & Billing:** Token advances, milestone payment tracking, GST invoices, and receipts.
5. **Advanced Floor & Kitchen Management:** Live operational dashboards for kitchen staff and floor managers.
