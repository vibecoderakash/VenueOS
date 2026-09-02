# 🛡️ VenueOS Engineering Guardrails & Deployment Protocols

> **Scope:** Mandatory safeguards for Git version control, Netlify hosting, Supabase cloud database, and AI agent operations.  
> **Status:** Active & Enforced

---

## 1. 🌿 Git Branch & Production Safety

### 1.1 Core Safety Rules (Non-Negotiable)

1. **`main` is the PRODUCTION RELEASE BRANCH:** It represents the version intended for live VenueOS users.
2. **`development` is the DEFAULT DEVELOPMENT / INTEGRATION BRANCH.**
3. **Dedicated Development Context:** All normal VenueOS development MUST happen on `development` or on a dedicated feature branch derived from `development`.
4. **No Direct Work on `main`:** Normal development work MUST NOT be performed directly on `main`.
5. **Standard Change Origin:** New features, UI changes, bug fixes, refactors, experiments, performance improvements, database-related application changes, and other non-emergency development work must start from `development`.
6. **Production Gatekeeping:** `main` must only receive code that has already been developed, tested, reviewed, and intentionally approved for production release.
7. **Prohibited Direct Pushes:** Direct pushes to `main` are strictly prohibited.
8. **PR-Only Promotion:** Production changes must reach `main` exclusively through a Pull Request.
9. **Production Deployment Event:** Because Netlify automatically deploys `main` to production, merging into `main` must be treated as an irreversible PRODUCTION DEPLOYMENT EVENT.
10. **Zero Incomplete Code:** Never push incomplete, experimental, partially tested, or unverified code to `main`.
11. **No Testing on Production:** Never use `main` as a testing or experimental branch.
12. **No Force-Pushing:** Never force-push (`git push --force`) to `main`.
13. **History Preservation:** Never rewrite, rebase public commits, or destroy `main` history.
14. **No Branch Deletion:** Never delete `main`.
15. **Branch Inspection Mandate:** AI agents MUST inspect the current Git branch before modifying any code.
16. **Safety Interception:** If an AI agent is asked to perform normal development while the current branch is `main`, it MUST NOT silently make changes directly on `main`. It should move to the appropriate `development` workflow or ask the user for clarification.
17. **No Silent Merges:** AI agents must NEVER silently merge `development` into `main`.
18. **Explicit Release Authorization:** AI agents must NEVER intentionally push or release to `main` without explicit user approval.
19. **Pre-Merge Verification Gate:** Before a production merge, all relevant automated tests (`npm test`), TypeScript checks (`npx tsc --noEmit`), runtime checks, and regression tests MUST pass.
20. **Continuous Deployability:** The production branch must always remain in a known, stable, deployable state.

---

### 1.2 Default Development Rule

```text
================================================================
DEFAULT RULE:
For normal day-to-day VenueOS development:

    development  =  WORK HERE
    main         =  PRODUCTION ONLY
================================================================
```

An AI agent or developer should assume `development` is the correct branch for normal development unless the user explicitly specifies another appropriate branch.

#### Recommended Branching Structure:

```text
    main  (Production Deployment)
      ▲
      │ (Approved Pull Request & Review)
      │
    development  (Active Development & Staging Deploy)
      ▲
      │ (Local Merge / PR)
      │
    feature/*  (Optional Isolated Feature Branches)
```

---

### 1.3 Feature Branch Policy

- **For small/simple changes:**
  ```text
  development ➔ work ➔ test ➔ commit ➔ push development
  ```
- **For larger/isolated features:**
  ```text
  development
      ↓
  feature/<feature-name>
      ↓
  local development & testing
      ↓
  merge into development
      ↓
  staging testing
      ↓
  Pull Request: development ➔ main
      ↓
  production release
  ```
- **Rule:** Feature branches must NOT be created directly from an outdated production `main` unless the task is specifically an emergency production hotfix.

---

### 1.4 Production Hotfix Policy

Emergency production fixes may use a dedicated branch:
```text
hotfix/<issue-name>
```

A hotfix must:
1. Start directly from the current production `main`.
2. Contain **only** the minimal required production fix.
3. Be fully tested (`npm test` and `npx tsc --noEmit`) before release.
4. Reach `main` through the normal Pull Request / review process.
5. **NEVER** be directly pushed to `main`.
6. **Mandatory Back-Sync:** After a hotfix is merged into `main`, the same fix MUST be synchronized (merged) back into `development` immediately so that `development` does not fall behind production.

---

### 1.5 AI Agent Safety Checklist

#### Before Coding:
1. Check current branch (`git branch`).
2. Check working tree status (`git status`).
3. Check recent Git history (`git log -n 3 --oneline`).
4. Understand whether the task is normal development, feature work, or an emergency hotfix.
5. Never assume `main` is safe for development work.

#### Normal Development Flow:
```text
development ➔ code ➔ test (npm test + tsc) ➔ commit ➔ push development
```

#### Production Promotion Flow:
```text
development ➔ staging verification ➔ Pull Request ➔ user review & approval ➔ main
```

#### 🛑 Mandatory Stop & Approval Conditions:
AI agents MUST stop and ask for explicit user approval before:
- Pushing to `main`
- Merging into `main`
- Creating a production release tag
- Intentionally triggering a production deployment
- Modifying production environment variables
- Executing destructive Git operations (`git reset --hard`, branch deletion)
- Rewriting Git history

---

## 2. 🚀 Netlify Deployment Guardrails

### 2.1 Deployment Contexts
- **Production (`main`):**
  - Live URL: `https://venusos.netlify.app` / custom domain.
  - Deploys **only** when a validated Pull Request is merged into `main`.
- **Branch Deploy (`development`):**
  - Staging URL: `https://development--venusos.netlify.app`.
  - Used for team testing, staging verification, and QA review before production merge.
- **Deploy Previews (`pull-request`):**
  - Temporary URL: `https://deploy-preview-<id>--venusos.netlify.app`.
  - Ephemeral isolated build generated for reviewing PRs before merging into `main`.

### 2.2 Environment & Safety Rules
- ❌ **Never Deploy Untested Code to Production:** Code must be verified on `development` and local runtime before promoting to `main`.
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
