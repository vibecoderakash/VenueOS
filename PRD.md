# VenueOS — Product Requirements & Development PRD

**Document type:** Living Product + Development PRD  
**Project:** VenueOS  
**Current baseline date:** 2026-08-31  
**Status:** Active development baseline  
**Primary development environment:** `C:\Users\akash\Desktop\AI Builder\VenueOS`  
**Frontend:** Next.js  
**Backend:** Supabase  
**Local development:** `npm run dev`  
**Local URL:** `http://localhost:3000`

---

## 1. Purpose of This Document

This document is the **current source of product/development context for VenueOS**.

Its purpose is to help developers and AI coding agents understand:

- what VenueOS is;
- what is already implemented;
- how authentication and organization isolation work;
- how business data is persisted;
- what rules must not be broken;
- what remains to be completed or hardened;
- how new features should be added safely;
- where future functionality should fit.

This is a **living document**. When a feature is completed, changed, removed, or redesigned, this document should be updated so it remains aligned with the actual implementation.

Where this document conflicts with an older PRD or earlier assumptions, the **latest confirmed development state documented here takes precedence**.

`Workflow.md` contains the detailed development workflow and operational rules. This PRD describes the current product state, requirements, architecture, and roadmap.

---

# 2. Product Overview

VenueOS is a banquet hall and event management platform intended to provide a central workspace for venue businesses.

The platform currently covers:

- Venue owner accounts
- Staff management foundations
- Lead management
- Event inquiries
- Customer discussion history
- Activity/audit records
- Organization-level data isolation
- Dashboard/reporting foundations
- Settings and account management

The long-term product can be expanded with additional banquet-hall functionality. New features should extend the existing organization, user, lead, and event-related data model rather than introducing disconnected systems.

---

# 3. Current Product State

## 3.1 Working / Implemented Areas

The current development baseline includes:

- Supabase authentication integration
- Venue owner setup flow
- Organization creation during setup
- Owner profile creation
- Organization relationship for authenticated users
- Login validation against Auth, profile, organization assignment, and account status
- Supabase-backed lead creation
- Lead persistence after refresh
- Lead editing
- Lead status changes
- Lead priority changes
- Sales owner assignment
- Lead archive/restore
- Lead discussions
- Lead activity logs
- Organization-level filtering/isolation foundations
- Staff loading foundations
- Staff account creation with Auth/profile cleanup on profile-write failure
- Staff self-service profile editing for name, phone, and password
- Inactive-user read-only access policy
- Owner-only business profile editing
- Settings page
- Business profile settings
- Organization ID visibility in Settings
- Organization deletion through a verified Danger Zone
- Light/dark theme support
- Sidebar collapse/expand behavior
- Improved form labels and helper text
- Themed select fields
- Calendar/date input improvements
- Browser autofill mitigation
- Improved loading/session handling
- More useful backend error display
- Multi-tenant Row-Level Security (RLS) policies across all tables
- Privacy-preserving setup check RPC (`public.check_has_owner()`)
- Persistent system audit logging table (`public.system_audit_logs`)
- Audit logging for organization deletion
- Organization deletion of all organization-linked Auth users
- Orphan Auth-user cleanup function with optional scheduled pg_cron execution
- Standardized API error codes and error response helpers
- Automated security and API validation test suites (`test-security.mjs`, `test-api.mjs`)
- Lead validation suite verifies valid payloads still require authentication (`test-leads.mjs`)
- Git history and feature-oriented commits

## 3.2 Current Fresh State

The previously created test venue account was deleted successfully.

The application is currently expected to show the **fresh setup flow** when there is no valid configured venue/session.

The server-side account-status diagnostic has been verified in local development: an unregistered email is identified as missing, while a registered Auth email is identified as existing. The service-role key is server-only and is never exposed to the browser.

To start development locally:

```bash
cd "C:\Users\akash\Desktop\AI Builder\VenueOS"
npm run dev
```

---

# 4. Product Principles

## 4.1 Supabase Is the Source of Truth

Business data must live in Supabase.

The browser may hold temporary form state and non-sensitive UI preferences, but business records must not be restored from browser storage.

Required data flow:

```text
User action
   ↓
API / Supabase request
   ↓
Database response
   ↓
Update UI
   ↓
Refresh from database to verify
```

Do not reintroduce LocalStorage as a fallback for business data.

## 4.2 Organization Isolation Is Mandatory

Every venue/business must only see its own organization data.

Business records should contain or be filtered by `organization_id`.

Authorization must be based on the authenticated user's profile and its organization relationship — never on an organization ID blindly supplied by the browser.

## 4.3 Database-First Persistence

A UI operation is not considered successfully completed merely because local UI state changed.

The database write must succeed, the UI should reflect the database response, and important persistence should be verified during development.

## 4.4 Small, Safe Changes

New functionality should extend the existing architecture instead of bypassing authentication, organization scoping, Supabase persistence, or established validation patterns.

## 4.5 Future Expansion

Future functionality may be added over time. New modules should reuse the existing authenticated organization context and shared records wherever appropriate.

---

# 5. Technology Stack

| Layer | Current technology |
|---|---|
| Frontend | Next.js |
| Backend | Supabase |
| Database | PostgreSQL through Supabase |
| Authentication | Supabase Auth |
| Hosting target | Vercel |
| Local development | Next.js development server |

---

# 6. Authentication & Venue Setup

## 6.1 Owner Setup Flow

A new venue owner setup collects:

- Full name
- Work email
- Phone number
- Venue name
- Password
- Confirm password

The work email becomes the login email.

Supabase Auth creates the authentication user.

A database trigger creates:

- Organization
- Owner profile
- Organization relationship

Setup is successful only when the user, organization, and owner profile are created together. A failed setup must not leave an orphan Auth user or partial organization state.

## 6.2 Atomic Setup Requirement

The database migration for atomic owner setup is:

```text
supabase/migrations/20260831_atomic_owner_setup.sql
```

The intended behavior is transactional:

- no orphan Auth user;
- no organization without a user;
- no profile without an organization.

If setup fails, the database operation should roll back appropriately.

## 6.3 Login Requirements

Login currently verifies:

1. Supabase Auth credentials
2. User profile
3. Organization assignment
4. Active account status

If the authenticated profile has no organization, the application must sign the user out instead of loading the dashboard with an invalid organization context.

Auth users without a matching database profile are treated as invalid/orphaned accounts and must not receive dashboard access. The UI must show a useful setup/login message rather than silently using fallback profile or venue data.

After valid Auth credentials are accepted, an account without a matching active venue/profile connection must receive the clear message: “This account is not connected to an active venue. Please contact your venue administrator.” Invalid credentials continue to use the generic credential error.

After valid credentials are accepted, an inactive account enters read-only mode and sees an inactive warning: “Your account is inactive. Please contact your administrator or venue owner to activate your account.” It may view permitted dashboard data but cannot create, edit, delete, assign, archive, restore, or otherwise mutate business data until reactivated.

When the server-side Auth diagnostic is configured, an email that is not registered receives: “No account exists with this email. Please contact your venue administrator.” If the diagnostic is unavailable, the application falls back to the generic credential error.

Inactive users are intended to sign in and view permitted dashboard data, while all business mutations are blocked in both the UI and backend/database policies. The application session behavior must remain aligned with this rule; it must not silently grant mutation access to an inactive account.

Production authentication errors should remain mostly generic to avoid unnecessarily revealing account existence.

---

# 7. Core Data Model

Current primary records include:

```text
auth.users
public.organizations
public.profiles
public.leads
Discussion-related records
Activity/audit records
Staff-related records
Settings-related records
```

Core relationship:

```text
auth.users.id
      ↓
public.profiles.id
      ↓
public.profiles.organization_id
      ↓
public.organizations.id
```

Every organization-owned business record must have a trustworthy organization boundary, normally through `organization_id` directly or through a verified relationship.

---

# 8. Lead Management

Lead management is currently the principal product workflow.

## 8.1 Lead Fields

The current lead form supports:

- Customer name
- Phone number
- Email
- Event type
- Event date
- Guest count
- Budget
- Lead source
- Sales owner
- Priority
- Requirement notes
- Initial follow-up date/time
- Follow-up action note

## 8.2 Lead UI Decisions Already Established

- Event date can be fixed or tentative.
- Guest count is a direct number input.
- Budget is a direct number input.
- Number input spinner arrows are removed.
- Date inputs have visible calendar icons.
- Date/time placeholders are readable.
- Select fields follow the application theme.
- Event date and guest controls remain aligned in a row.
- Phone number is mandatory where the workflow requires it.

## 8.3 Implemented Lead Operations

The application already supports:

- Create lead
- Persist lead to Supabase
- Refresh and verify persistence
- Edit lead
- Change status
- Change priority
- Assign sales owner
- Archive lead
- Restore lead
- Add discussions
- Persist and display activity logs

## 8.4 Lead Verification Workflow

When validating a lead feature:

1. Create the lead.
2. Confirm success in the UI.
3. Refresh the page.
4. Confirm the lead still exists.
5. Check Supabase directly using the authenticated organization boundary.
6. Test edit/status/priority/owner changes.
7. Test archive and restore.
8. Test discussions and activity persistence.

---

# 9. Discussions

Discussion history is part of the lead record workflow.

The system should preserve a chronological record of customer conversations so another staff member can understand what happened previously.

Discussion data is persisted in Supabase.

The intended model includes:

- lead reference
- organization reference
- author/user reference
- discussion body
- created/updated timestamps

The UI should treat discussions as durable business history, not browser-only notes.

---

# 10. Activity / Audit Records

Important lead actions should generate activity/audit records.

Examples include:

- discussion added
- assignment changed
- status changed
- follow-up changed
- other important state changes

Activity records should identify:

- affected lead
- organization
- acting user
- action type
- relevant metadata
- timestamp

This creates a traceable history of important changes.

---

# 11. Organization Data Isolation

Organization isolation is a core security requirement.

The current user’s organization must always be derived from the authenticated profile.

It must not come from:

- LocalStorage
- hardcoded IDs
- arbitrary browser values
- unverified request parameters

Correct pattern:

```text
authenticated user
       ↓
profile
       ↓
organization_id
       ↓
authorized query
```

Unsafe pattern:

```text
browser organization ID
       ↓
database query
```

unless the server/database has independently verified that the organization belongs to the authenticated user.

The Settings page currently communicates that leads, discussions, and audit records are isolated by organization.

---

# 12. Backend / API Security Rules

Every API/data operation should follow this sequence:

1. Get the authenticated Supabase user.
2. Load the user's profile.
3. Confirm `organization_id` exists.
4. Confirm the user has permission for the operation.
5. Filter database queries by the verified organization.
6. Perform the requested mutation/query.
7. Return a useful error response.
8. Never trust an organization ID supplied only by the browser.

Sensitive authorization must be enforced server-side/database-side, not only through UI visibility.

Supabase service-role keys must never be exposed in browser code.

---

# 13. LocalStorage Policy

Business data was migrated away from browser storage.

Previous business-related keys included:

```text
venue_os_org_v1
venue_os_leads_v1
venue_os_activity_v1
venue_os_discussions_v1
```

These must not be used as the source of truth anymore.

Allowed browser storage is limited to non-sensitive UI preferences, such as:

```text
venue_os_theme
venue_os_sidebar_collapsed
```

Do not store in LocalStorage:

- organization data
- leads
- discussions
- activity logs
- staff records
- authentication data
- passwords
- sensitive user information

---

# 14. Staff Management

Settings includes team/staff management foundations.

Staff records must be loaded from Supabase and filtered by the current organization.

The Sales Owner selector must only show valid staff/owner profiles belonging to the current organization.

The owner must not appear as a duplicate entry in the Sales Owner list.

A staff invitation flow is planned future work and is not assumed complete unless separately implemented.

### 14.1 Staff Permissions

- Owners and General Managers can manage staff accounts according to their role permissions.
- Staff users cannot manage the team or change organization settings.
- Staff users can edit only their own name, phone number, and password.
- Staff email and role are not editable by the staff member.
- If staff profile creation fails after Auth creation, the newly created Auth user must be deleted automatically.
- Staff records must be removed when their organization is deleted.

---

# 15. Settings & Account Management

Settings currently contains foundations for:

- Business profile
- Business name
- Phone
- Email
- City/region
- Venue address
- Currency
- Team and Staff Management
- Data Isolation
- Account and Session
- Danger Zone

Only the owner can edit the business profile. Other roles see the profile as view-only.

The organization ID is displayed in the data-isolation section.

---

# 16. Organization Deletion

The application includes a Danger Zone for owner-controlled organization deletion.

Deletion requires:

1. Authenticated user
2. Active owner role
3. Exact organization name confirmation

The database function is:

```text
public.delete_current_organization(p_organization_id)
```

Migration:

```text
supabase/migrations/20260830_delete_organization.sql
```

The deletion flow removes organization-owned records including:

- Leads
- Discussions
- Activity records
- Staff profiles
- Settings
- Organization
- Current Auth user
- All other Auth users whose profiles belong to the organization

Deletion is permanent.

The owner is intentionally restricted to the verified Danger Zone path for this operation.

The organization deletion flow has already been tested successfully, including redirect to Login and return to the fresh setup flow.

The deletion function is defined by the latest organization-deletion migration and must be applied before using the Danger Zone. Direct organization deletion through the Supabase Table Editor is not supported because it can bypass Auth cleanup.

An orphan cleanup function removes old Auth users that have no matching `public.profiles` row. It is intended as a safety net, not a replacement for atomic setup or application-managed deletion.

---

# 17. Current UI State

Completed UI improvements include:

- Sidebar toggle
- Toggle positioned at the bottom of the sidebar
- Tested collapsed/expanded sidebar states
- Light/dark theme improvements
- Calendar icon visibility in both themes
- Premium themed select fields
- Better setup form labels/helper text
- Removal of intentional venue defaults from setup fields
- Reduced browser autofill interference
- Improved invalid/unlinked-session loading behavior
- More useful exact backend errors where appropriate

The application should retain the existing professional business-app direction.

---

# 18. Error & Empty-State Requirements

The application should provide useful handling for:

### No leads
Explain how to create the first lead.

### No search results
Provide a clear empty state and an easy reset-search action.

### Duplicate phone / existing record
Show the existing record and give a clear path to open it rather than silently creating duplicate business data.

### Save failure
Preserve entered text and allow retry where feasible.

### Permission denied
Explain that the user does not have access to the requested operation.

### Network failure
Provide a non-blocking error and retry option where feasible.

### Invalid/unlinked session
Do not load a misleading dashboard state. Resolve the session/profile/organization relationship first.

---

# 19. Git / Source-Control Rules

Git is already initialized and used for project history.

Existing history includes commits covering areas such as:

- initial repository
- Supabase migration
- lead migration
- organization deletion
- atomic setup
- authentication fixes
- sidebar toggle
- form validation
- phone requirement
- UI improvements

Before making changes:

```bash
git status
git log --oneline -10
```

When appropriate, use a feature branch:

```bash
git checkout -b codex/feature-name
```

Do not use destructive commands such as:

```bash
git reset --hard
```

unless explicitly requested.

---

# 20. Development Verification Rules

For database-backed features, do not verify only through the browser UI.

At minimum, important workflows should be checked through:

1. UI behavior
2. Page refresh / persistence
3. Supabase record verification
4. Organization scoping
5. Permission behavior
6. Error behavior

A feature should not be considered complete merely because it visually works.

---

# 21. Current Recommended Work

### 21.1 Completed Hardening (Current Baseline)
- ✅ Row-Level Security (RLS) policies verified and hardened across all tables (`organizations`, `profiles`, `leads`, `lead_discussions`, `lead_activity`, `lead_assignment_history`, `system_audit_logs`).
- ✅ Database foreign keys with `ON DELETE CASCADE` verified across all tenant boundaries.
- ✅ Privacy-preserving setup check RPC (`public.check_has_owner()`) eliminating PII exposure to anonymous visitors.
- ✅ Standardized API error codes and structured error handling helpers (`createSafeErrorResponse`, `API_ERROR_CODES`).
- ✅ Dedicated `public.system_audit_logs` table for tracking security lifecycle events.
- ✅ Audit logging integrated into `public.delete_current_organization` RPC prior to cascaded deletion.
- ✅ Verified that Supabase service-role keys are strictly server-side (`lib/supabase/admin.ts`) and never leaked to browser code.
- ✅ Automated security & API test suites (`scripts/test-security.mjs`, `scripts/test-api.mjs`).

### 21.2 Active Recommended Backlog
1. Staff invitation flow (email invites & role assignment).
2. Email confirmation handling during setup.
3. Password reset testing & recovery flow.
4. Lead pagination and advanced filtering.
5. Optimistic UI updates (after database persistence confirmation).
6. Development-only database seed command instead of hardcoded demo data.
7. Database health/status screen for owners.
8. Automated end-to-end tests for setup rollback, deletion/Auth cleanup, inactive read-only access, and orphan cleanup.
9. Banquet V2 features (Bookings, Calendar Availability, Quotations, Payments, Analytics).

---

# 22. AI Development Rules

This section is especially important for AI coding agents working on VenueOS.

## Rule 1 — Inspect Before Changing

Before implementing a feature or fixing a bug, inspect the existing code path, database model, API route, and authentication/organization flow.

Do not assume the old PRD describes the current implementation.

## Rule 2 — Preserve Supabase as Source of Truth

Do not create a LocalStorage fallback for leads, organizations, staff, discussions, activity, or other business data.

## Rule 3 — Resolve Organization From Authenticated State

Never trust a client-provided `organization_id` as authorization.

Always derive or verify it through the authenticated user's profile.

## Rule 4 — Respect Existing Permissions

A UI restriction is not enough. Mutations must also enforce permission rules on the backend/database side.

## Rule 5 — Keep Features Organization-Scoped

Any newly introduced organization-owned table/record should have an explicit and trustworthy organization boundary.

## Rule 6 — Persist Before Declaring Success

A user action should not be treated as successful merely because React state changed.

Confirm the Supabase mutation response.

## Rule 7 — Verify Persistence

Important changes should survive refresh/reload and should be verifiable in Supabase.

## Rule 8 — Do Not Duplicate Existing Concepts

Before adding a new entity/table/state object, check whether the current schema already represents the same business concept.

## Rule 9 — Avoid Unnecessary Architecture Changes

Do not introduce large state-management systems, major libraries, or architectural rewrites unless the existing codebase genuinely requires them.

## Rule 10 — Preserve Security

Never expose Supabase service-role credentials in browser/client code.

## Rule 11 — Preserve Existing UX Decisions

Do not casually undo established behavior such as themed selects, date inputs, sidebar behavior, phone validation, or setup-form behavior.

## Rule 12 — Keep This PRD Current

Whenever a feature becomes implemented, materially changes, or is removed, update this PRD so future AI sessions have an accurate baseline.

---

# 23. Future Feature Development Model

VenueOS will evolve by adding more functionality over time.

When a new feature is proposed, the preferred development sequence is:

```text
Feature requirement
      ↓
Check existing product/data model
      ↓
Define organization/security boundary
      ↓
Design database changes if required
      ↓
Implement backend/API behavior
      ↓
Implement frontend workflow
      ↓
Handle permissions + errors
      ↓
Test persistence after refresh
      ↓
Verify organization isolation
      ↓
Update this PRD + Workflow.md
      ↓
Commit the change
```

Future features should fit the existing product foundation rather than becoming isolated mini-applications.

---

# 24. Product Expansion Direction

The product is intended to grow beyond the current lead-management foundation.

Potential future areas can include additional banquet-hall workflows such as:

- Staff operations
- More complete event inquiry workflows
- Booking management
- Event calendar/availability
- Quotations
- Payments
- Customer history
- Reporting/analytics
- Other venue operations

A future feature is not considered implemented merely because it is mentioned in this document. Only confirmed development state should be marked as complete.

---

# 25. Current Source-of-Truth Hierarchy

When an AI agent is deciding what is true about VenueOS, use this order:

1. **Actual current code and database behavior**
2. **This latest PRD**
3. **`Workflow.md` development rules**
4. Older PRDs / historical documentation

If documentation and actual implementation disagree, inspect the implementation first and then update the documentation.

---

# 26. Definition of a Safe Feature Completion

A new feature is considered ready only when applicable parts of the following are true:

- UI exists and works.
- Backend/database behavior exists.
- Authentication is respected.
- Organization scoping is respected.
- Permissions are enforced.
- Error and empty states are handled.
- Data persists correctly.
- Refresh does not lose business data.
- Supabase contains the expected records.
- Existing functionality still works.
- Documentation is updated.
- Git history clearly identifies the change.

---

# 27. Final Current-State Summary

VenueOS currently has a functioning foundation built around **Next.js + Supabase** with organization-aware authentication and database-backed lead management.

The most important architectural rule is:

> **Supabase is the source of truth; the authenticated user's profile determines the organization context.**

The project is no longer dependent on browser storage for business data.

The current product can already create and manage leads, persist discussions and activity, manage ownership/status/priority, archive/restore leads, manage venue settings, and safely delete an organization through an owner-verified Danger Zone flow.

The next stage should focus on production hardening, security verification, automated testing, staff workflows, pagination, and then incremental expansion into additional banquet-hall functionality.

---

# 28. AI Agent Quick Context

For an AI agent entering the project for the first time:

```text
PROJECT: VenueOS
PURPOSE: Banquet hall / event management platform
FRONTEND: Next.js
BACKEND: Supabase
SOURCE OF TRUTH: Supabase
AUTH: Supabase Auth
PRIMARY SECURITY BOUNDARY: organization_id resolved from authenticated profile
CURRENT CORE MODULE: Lead Management
BUSINESS DATA IN LOCALSTORAGE: NO
LOCALSTORAGE: UI preferences only
CURRENT STATE: Fresh setup flow after successful deletion of prior test venue
IMPORTANT DATABASE MIGRATIONS:
  - supabase/migrations/20260830_delete_organization.sql
  - supabase/migrations/20260831_atomic_owner_setup.sql
  - supabase/migrations/20260831_security_and_rls_hardening.sql
  - supabase/migrations/20260831_delete_organization_all_auth_users.sql
  - supabase/migrations/20260831_inactive_users_read_only.sql
  - supabase/migrations/20260831_orphan_auth_cleanup.sql
  - supabase/migrations/20260831_owner_only_business_profile.sql
DEVELOPMENT COMMAND: npm run dev
LOCAL URL: http://localhost:3000
READ BEFORE CHANGING: this PRD + Workflow.md + actual code
NEVER: trust browser organization_id for authorization
NEVER: reintroduce LocalStorage as business-data fallback
NEVER: expose service-role keys in client code
ALWAYS: verify authenticated user → profile → organization → permission → database operation
ALWAYS: verify important persistence after refresh
ALWAYS: update documentation after meaningful product changes
```

---

**Document maintenance note:** This PRD should be updated continuously as VenueOS gains new modules, workflows, security rules, database tables, UI behavior, and integrations.
