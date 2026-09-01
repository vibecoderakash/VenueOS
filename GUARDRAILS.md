# 🛡️ VenueOS Engineering Guardrails & Deployment Protocols

> **Scope:** Mandatory safeguards for Git version control, Netlify hosting, Supabase cloud database, and AI agent operations.  
> **Status:** Active & Enforced

---

## 1. 🌿 Git Branching & Workflow Guardrails

### 1.1 Branch Architecture
- **`main` (Production Branch):**
  - Represents live, battle-tested production code.
  - Automatically builds and deploys to Netlify Production.
  - **Strictly Protected:** No direct pushes are ever permitted on `main`.
  - All production modifications must arrive through an approved **Pull Request (PR)** originating from `development`.
- **`development` (Active Development Branch):**
  - Represents the staging and active feature development baseline.
  - Builds and deploys to a non-production Netlify branch preview (`development--<site>.netlify.app`).
  - All day-to-day coding, refactoring, and feature additions must take place on or branch from `development`.

### 1.2 Git Execution Constraints
- ❌ **No Direct Pushes to `main`:** Every commit must be staged and tested on `development`.
- ❌ **No Force Pushing (`git push --force`):** Rewriting Git history on remote branches is strictly forbidden.
- ❌ **No Destructive Commands:** `git reset --hard` (on public commits), `git branch -D main`, or branch deletion is blocked.
- ❌ **No Auto-Pushing by AI:** As per PRD Rule 13, all remote pushes and release version tag creation require explicit user confirmation.

---

## 2. 🚀 Netlify Deployment Guardrails

### 2.1 Deployment Contexts
- **Production (`main`):**
  - URL: `https://<site-name>.netlify.app` / custom domain.
  - Deploys **only** when a validated Pull Request is merged into `main`.
- **Branch Deploy (`development`):**
  - URL: `https://development--<site-name>.netlify.app`.
  - Used for team testing, staging verification, and QA review before production merge.
- **Deploy Previews (`pull-request`):**
  - URL: `https://deploy-preview-<id>--<site-name>.netlify.app`.
  - Temporary isolated build for reviewing PRs before merging into `main`.

### 2.2 Environment & Safety Rules
- ❌ **Never Deploy Untested Code to Production:** Code must be verified on `development` or local runtime before promoting to `main`.
- ❌ **No Production Environment Modification:** Production environment variables in Netlify must never be altered without explicit user authorization.

---

## 3. 🗄️ Supabase PostgreSQL Guardrails

### 3.1 Single Source of Truth
- Supabase PostgreSQL with Row-Level Security (RLS) is the **only authoritative store** for business data (leads, inquiries, staff profiles, organizations, discussions, activity logs).
- ❌ **Never use browser storage (LocalStorage/IndexedDB) as a fallback** for business records.
- Browser LocalStorage is strictly confined to non-critical UI preferences (`venue_os_theme`, `venue_os_sidebar_collapsed`).

### 3.2 Secret Isolation & RLS Integrity
- 🔒 **Service Role Key:** `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to client-side code (`NEXT_PUBLIC_*`). It is strictly restricted to server-side Node.js API endpoints and database administration tasks.
- 🔒 **RLS Hardening:** Never disable or weaken RLS policies on tables (`organizations`, `profiles`, `leads`, `lead_discussions`, `lead_activity`, `system_audit_logs`).
- 🔒 **Tenant Scoping:** All database queries must enforce tenant isolation via verified `organization_id`.

---

## 4. 🤖 AI Agent Operating Guardrails

1. **Inspect Before Changing:** Always inspect the existing code, dependencies, and state machine before proposing or making modifications.
2. **No Unrelated Modifications:** Only touch the exact files required for the task. Preserve existing comments and docstrings.
3. **No Unnecessary Packages:** Do not install new npm dependencies without explicit justification and user approval.
4. **No Destructive Database Actions:** Never drop tables, alter schema destructively, or wipe database data.
5. **Quality Verification:** Always verify TypeScript compilation (`npx tsc --noEmit`) and run automated test suites (`npm test`) after meaningful changes.
