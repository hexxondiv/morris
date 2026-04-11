# Target Schema Overview

This document is the authoritative downstream contract for the first-party data model introduced in workstream `02-target-schema-and-domain-model`.

## Stack Decision

- ORM: `Prisma`
- Database target: `MySQL`

### Why `Prisma`

`Prisma` was selected over `Drizzle` for this workstream because:

1. the project needs a single authoritative schema artifact that later auth work can wire directly into `Auth.js`
2. the target model spans auth, RBAC, projects, finance, cases, settings, and audits, and Prisma's schema format is clearer for cross-team handoff
3. the migration and seed workflow is straightforward for a staged replacement where the repository, not Supabase, owns the schema

## Canonical Entity Set

### Auth and Identity

- `users`
- `profiles`
- `accounts`
- `sessions`
- `verification_tokens`

### Authorization

- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

### Projects and Voting

- `projects`
- `project_timelines`
- `project_stages`
- `project_stage_media`
- `voting_periods`
- `votes`
- `events`

### Financial and Ledger

- `pledges`
- `ledger_accounts`
- `transactions`

### Cases and Reference Data

- `states`
- `lgas`
- `cases`
- `case_files`
- `case_notes`

### Platform Configuration and Audit

- `settings`
- `audit_logs`

## Major Relationships

- `users 1:1 profiles`
- `users 1:n accounts`
- `users 1:n sessions`
- `users n:m roles` through `user_roles`
- `roles n:m permissions` through `role_permissions`
- `users 1:n projects` through `projects.creator_id`
- `projects 1:1 project_timelines`
- `project_timelines 1:n project_stages`
- `project_stages 1:n project_stage_media`
- `projects 1:1 voting_periods`
- `users n:m projects` for voting through `votes`
- `users 1:n pledges`
- `projects 1:n pledges`
- `pledges 1:n transactions`
- `ledger_accounts 1:n transactions`
- `projects 1:n transactions`
- `project_stages 1:n transactions`
- `users 1:n cases` as reporter, plus optional assignee and reviewer references
- `cases 1:n case_files`
- `cases 1:n case_notes`
- `states 1:n lgas`
- `states 1:n cases`
- `lgas 1:n cases`
- `users 1:n events`
- `projects 1:n events`
- `users 1:n audit_logs` as actor and optional target

## Delete Rules

- `users -> profiles/accounts/sessions/user_roles/votes` cascade
- `users -> projects` restrict
- `users -> pledges/transactions/cases/events/audit_logs` set null where historical ownership must survive
- `projects -> timelines/voting_periods` cascade
- `project_timelines -> project_stages` cascade
- `project_stages -> project_stage_media` cascade
- `projects -> pledges/transactions/events/votes` set null or cascade based on historical retention:
  - `votes` cascade
  - `pledges`, `transactions`, `events` set null
- `cases -> case_files/case_notes` cascade
- `states/lgas` are reference data and use `restrict`

## Domain Notes By Product Area

### Users, Accounts, Sessions

- `users` is the canonical identity table
- `accounts` is the provider link table for Google OAuth via `Auth.js`
- `sessions` is the first-party session store
- `verification_tokens` is present for Auth.js compatibility even if Google sign-in is the primary path

### RBAC

- role names are not stored directly on `users`
- authorization is normalized through `roles`, `permissions`, `role_permissions`, and `user_roles`
- `super_admin` is a seeded system role, not a hardcoded vendor metadata flag

### Projects and Lifecycle

- `projects.status` covers `draft`, `proposed`, `voting`, `active`, `completed`, `cancelled`, and `archived`
- project implementation planning is normalized into:
  - `project_timelines`
  - `project_stages`
  - `project_stage_media`
- this replaces the current flat `project_timelines` stage table with a clearer model for downstream transactional services

### Financial Model

- `pledges` records commitment state
- `transactions` records financial events
- `ledger_accounts` replaces the current ad hoc `charts` table with a first-party ledger categorization model
- `transactions.direction` plus `transactions.kind` supports public ledger and admin ledger views without carrying Supabase-specific RPC patterns forward

### Voting

- `voting_periods` is explicit and one-per-project in the initial owned model
- `votes` enforces one vote per user per project with `VoteChoice`
- eligibility thresholds should be enforced in service code using settings and qualifying contributions

### Cases

- intake uses `cases`
- uploaded evidence uses `case_files`
- internal admin review notes use `case_notes`
- `states` and `lgas` remain first-party reference data, not external lookups

### Settings

- `settings.value` is JSON to avoid stringly-typed persistence
- data type, validation rules, cache strategy, and access level are stored alongside the setting
- later service code should convert to typed values before exposure

### Events and Audit

- `events` supports project-linked and non-project events
- `audit_logs` is the canonical trail for privileged changes, payment/webhook effects, and bootstrap actions

## First-Run Bootstrap Strategy

Bootstrap is deterministic and idempotent:

1. read `BOOTSTRAP_SUPER_ADMIN_EMAIL`
2. read `BOOTSTRAP_SUPER_ADMIN_NAME`
3. upsert the user by email in `users`
4. upsert the profile row in `profiles`
5. upsert the `super_admin` role and permission catalog
6. upsert the `user_roles` assignment for that user
7. record the action in `audit_logs`

Implementation entrypoints:

- `npm run db:seed`
- `npm run db:bootstrap-super-admin`
- seed logic: `prisma/seed.ts`

### Bootstrap Safety Rules

- rerunning bootstrap does not create duplicate users or duplicate role assignments
- bootstrap identity is keyed by email, which is compatible with the later Google sign-in linkage in workstream `03`
- no password or vendor metadata is stored in this workstream
- later auth code should only auto-link a Google account to the bootstrap record when the provider-verified email matches the seeded email exactly

## Ledger View Strategy

The schema supports first-party ledger views in MySQL without relying on Supabase RPCs.

Planned read models:

- SQL view for transaction rows with joined user, pledge, project, stage, and ledger account labels
- SQL view for public ledger-safe rows that exclude internal-only fields
- service-layer aggregate query for dashboard and export filters

MySQL does not provide native materialized views. When a materialized read model is needed, use:

- a summary table owned by the application
- refresh via background job or webhook-driven updater
- audit the refresh in `audit_logs`

## Supabase RPC Replacement Map

| Current RPC | Current Use | Replacement Type | Target Replacement |
| --- | --- | --- | --- |
| `get_supabase_user_id` | Clerk-to-Supabase identity bridge | `ORM query` | Remove entirely. Internal auth will resolve `users.id` and `accounts.provider_account_id` directly. |
| `get_user_dashboard_data` | Current-user dashboard aggregate | `application service` | Compose profile, pledge summary, contribution totals, and recent transactions via Prisma queries and service-level aggregation. |
| `increment_project_current_amount` | Payment webhook side effect | `application service` | Replace with one DB transaction that posts the transaction row and updates project or stage totals atomically. |
| `get_pledges` | Admin pledge listing with joins and count | `ORM query` | Prisma query with filters, joins, pagination, and a separate count query. |
| `get_transactions` | Admin transaction listing, filters, and count | `SQL view` | Query a MySQL view that flattens transaction joins, then filter and paginate via Prisma raw query or repository methods. |
| `fetch_transaction` | Transaction detail lookup | `ORM query` | Replace with a repository method using Prisma `findUnique` plus related records. |
| `get_open_ledger_metrics` | Public ledger metrics aggregate | `materialized view` | Replace with a MySQL-owned summary table or snapshot table refreshed by jobs/webhooks, with a thin service reader. |
| `get_marquee_data` | Homepage marquee aggregate | `SQL view` | Replace with a MySQL view over featured projects plus metrics/settings inputs, with final shaping in an application service. |

## File Group Coverage

This schema is designed to unblock every file group called out in `docs/file-by-file-migration-map.md`:

- core platform and auth
- core database and service layer
- projects and public project views
- project timeline APIs and actions
- pledges, transactions, voting, and ledger
- cases and supporting reference data
- events, settings, and utilities

## Known Service-Layer Work Still Required

- Google OAuth account linking and session issuance
- authorization helpers such as `requireAuth`, `requireRole`, and permission checks
- transactional write services for:
  - pledge checkout
  - payment webhook handling
  - timeline stage start and completion
  - case review and approval
  - settings updates with audit capture
- typed settings conversion and validation service
- public ledger and marquee read-model refresh jobs
- data migration scripts from Clerk and Supabase into the owned schema

## Explicit Business Gaps Still Needing Decisions

- whether unauthenticated donors can create `pledges`, or only one-off `transactions`
- whether projects may later own multiple timeline versions instead of the initial one-to-one timeline
- whether vote eligibility is lifetime-based, rolling-window-based, or settings-defined per period
- whether approved cases can generate linked financial disbursement records directly
- whether `events` should support attendee registration or remain informational

These gaps do not block workstreams `03`, `05`, `06`, `07`, or `08`, but they do need service-layer policy decisions during implementation.
