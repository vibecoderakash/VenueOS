# 🏰 Venue OS (V1) - Banquet Hall Management SaaS

> **Core Focus**: Purpose-built Lead Management & Conversation Continuity for banquet halls.
> 
> *"Open the lead. Understand the customer. Know the next action."*

---

## 🌟 Overview & PRD Alignment

Venue OS is designed specifically for banquet hall sales and operational workflows. When a customer speaks with one team member today and another tomorrow, anyone opening the lead can immediately grasp previous discussions, understand requirements (event date, guest count, hall preferences, budget), trigger quick Call or WhatsApp actions, log a short plain-text discussion summary, and schedule the next follow-up.

### Key Capabilities in V1:
1. **Multi-Module SaaS Shell**: Persistent sidebar with active modules (**Dashboard**, **Leads**, **Reports**, **Settings**) and upcoming V2 placeholders (**Bookings**, **Quotations**, **Calendar**, **Customers**, **Payments**).
2. **Operational Dashboard**: Real-time queues for **Overdue Follow-ups** (with urgent pulse alert), **Due Today**, **New Inquiries**, and a live team activity feed.
3. **Banquet Lead Inbox**: Fast live search across customer names, phone numbers, and discussion notes with multi-dimension filters (Status, Priority, Owner, Event Type, Lead Source, Follow-up state, Archived).
4. **Duplicate Phone Detection**: Real-time duplicate phone number detection during lead creation to prevent duplicate entries and link directly to existing records.
5. **Reverse-Chronological Discussion Timeline (Core V1)**: Manual discussion entries with author badges, relative/exact timestamps, inline quick logging, and 1-click follow-up scheduling.
6. **Banquet Context & Follow-up Scheduler**: Event date countdown, guest count, budget per pax calculation, and quick scheduling shortcuts (*Today 5:30 PM*, *Tomorrow 11 AM*, *In 2 Days*, *Next Monday*).
7. **Multi-Tenant Supabase Architecture**: PostgreSQL schema with Row-Level Security (RLS) policies scoped to `organization_id` for SaaS tenant isolation.
8. **Operational Analytics**: Pipeline conversion funnel, follow-up adherence rate, and sales rep performance breakdown.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS v4, Lucide React Icons, Glassmorphism luxury theme
- **Backend & Database**: Supabase (PostgreSQL with RLS), Zod validation
- **Animations & Effects**: Canvas Confetti (celebration on lead conversion)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Setup (Supabase)

To connect your Supabase database:
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Paste your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Run the SQL migration in `supabase/schema.sql` inside the Supabase SQL Editor.
