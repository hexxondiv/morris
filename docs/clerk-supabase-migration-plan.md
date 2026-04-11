# MORRIS MONYE Migration Plan

## Objective

Transition the application from `Clerk` and `Supabase` to a fully in-house model management stack with:

- Direct `Sign in with Google`
- First-party user, role, and session management
- First-party schema ownership and migrations
- First-party database transactions and access control
- First-party file storage integration

## Current State

The current codebase is tightly coupled to both external services.

- `Clerk` is used for authentication, route protection, profile access, role lookups, sign-in/sign-up pages, middleware, and user management flows.
- `Supabase` is used for database reads/writes, RPC calls, storage uploads, public ledger data, settings, transactions, project management, and case management.

Repository impact identified during audit:

- `49` files currently reference `Clerk`
- `45` files currently reference `Supabase`

This requires a staged replacement rather than a direct cutover.

## Recommended Target Stack

### Authentication

- `Auth.js` for first-party authentication flow
- `Google OAuth` provider for direct sign-in
- Cookie-based sessions managed by the app

### Database and Schema

- Managed `MySQL`
- `Prisma` or `Drizzle` as the application ORM and schema migration layer

### Storage

- `S3` or `Cloudflare R2` for image and file storage

### Internal Domain Ownership

- First-party ownership of:
  - `users`
  - `profiles`
  - `roles`
  - `sessions`
  - `accounts`
  - `projects`
  - `pledges`
  - `transactions`
  - `cases`
  - `case_files`
  - `votes`
  - `settings`
  - `project_timelines`
  - audit logs

## Migration Principles

1. Replace vendors behind internal service boundaries first.
2. Move reads before writes where possible.
3. Use transactional writes in the new database layer.
4. Avoid changing business flows and persistence layer in the same step unless necessary.
5. Keep the app deployable throughout the migration.
6. Run a dual-read or verification period before final cutover.

## Execution Phases

## Phase 0: Immediate Risk Reduction

1. Rotate exposed secrets and keys currently present in `.env.example`.
2. Replace real credentials in `.env.example` with placeholders.
3. Freeze new Clerk/Supabase-specific feature work during migration planning.

## Phase 1: Introduce the New Data Layer

1. Add the ORM package and migration tooling.
2. Create the first-party schema for:
   - users
   - profiles
   - user roles
   - projects
   - pledges
   - transactions
   - votes
   - cases
   - case files
   - settings
   - project timelines
   - events
   - audit logs
3. Define proper foreign keys, indexes, enums, and transaction-safe write paths.
4. Add seed data and environment-specific migration workflows.
5. Ensure the very first environment bootstrap seeds at least one `super admin` user safely and deterministically.

## Phase 2: Introduce First-Party Auth with Google

1. Install and configure `Auth.js`.
2. Add direct `Google` OAuth sign-in.
3. Create tables for:
   - users
   - accounts
   - sessions
   - verification tokens
4. Map Google identities to internal user records.
5. Ensure first-run bootstrap creates at least one internal `super admin` account.
6. Move role ownership from Clerk metadata into database-backed role records.
7. Add internal helpers for:
   - `getCurrentUser`
   - `requireAuth`
   - `requireRole`
   - `getSession`

## Phase 3: Add Internal Service Abstractions

Replace direct vendor access with internal modules.

1. Replace `lib/clerk.ts` with internal auth helpers.
2. Replace `lib/supabase.ts` and `lib/supabase-admin.ts` with internal database clients and repositories.
3. Replace `lib/supabase-provider.tsx` with session or API-backed state providers only if still needed.
4. Introduce modules such as:
   - `lib/auth`
   - `lib/db`
   - `lib/repositories`
   - `lib/storage`
   - `lib/permissions`

Goal: application code stops importing vendor SDKs directly.

## Phase 4: Migrate Read Paths

Convert read-heavy routes and actions first.

Priority order:

1. Settings
2. Projects
3. Public ledger
4. Users and roles
5. Cases
6. Voting data
7. Transactions and pledges

Targets include:

- `app/api/projects`
- `app/api/projects/[slug]`
- `app/api/open-ledger-metrics`
- `app/api/marquee-data`
- `app/api/settings`
- `app/api/users`
- `lib/actions/*`

All Supabase `select` and `rpc` usage should be replaced with ORM queries or internal service calls.

## Phase 5: Migrate Write Paths

Convert all mutation flows to first-party transactional logic.

Priority order:

1. User profile sync and roles
2. Project create/update flows
3. Pledges
4. Transactions
5. Voting
6. Case creation and admin case updates
7. Timeline stage updates
8. Settings updates and audits

Requirements:

- Use database transactions for multi-step mutations
- Remove manual rollback patterns currently required by Supabase limitations
- Preserve current validation rules and authorization checks

## Phase 6: Replace File Storage

1. Introduce a first-party storage adapter for `S3` or `R2`.
2. Replace Supabase Storage usage in:
   - project image uploads
   - case file uploads
   - avatar uploads
3. Update persisted file URL generation.
4. Migrate any existing assets if they must remain available.

## Phase 7: Replace Clerk UI and Middleware

Replace current auth entry points and auth-aware components.

Targets include:

- `app/(public)/sign-in/[[...sign-in]]/page.tsx`
- `app/(public)/sign-up/[[...sign-up]]/page.tsx`
- `middleware.ts`
- all `useUser`, `useAuth`, `SignIn`, `SignUp`, `ClerkProvider`, and `clerkMiddleware` usage

Replace with:

- custom sign-in page
- Google sign-in button
- first-party session-aware middleware
- internal session hooks and server helpers

## Phase 8: Data Migration and Verification

1. Export users, roles, project records, pledges, transactions, settings, case records, and timelines from Supabase.
2. Normalize and import them into the new schema.
3. Map Clerk users to internal users by email and provider account identifiers.
4. Run verification scripts for:
   - row counts
   - foreign key integrity
   - balances and ledger totals
   - role mappings
   - project totals
5. Run a dual-read verification period where necessary.

## Phase 9: Cutover and Removal

1. Switch all production traffic to the new auth and data layers.
2. Remove Clerk packages and configuration.
3. Remove Supabase packages and configuration.
4. Remove Supabase-specific migrations, RPC dependencies, and storage code.
5. Delete compatibility shims once stable.
6. Verify the full application still works correctly and cleanly on the new stack after dependency removal.

## Code Areas Most Affected

### Clerk-Coupled Areas

- `app/layout.tsx`
- `middleware.ts`
- `lib/clerk.ts`
- `app/(public)/sign-in/[[...sign-in]]/page.tsx`
- `app/(public)/sign-up/[[...sign-up]]/page.tsx`
- dashboard and admin pages using `useUser`, `useAuth`, or Clerk server auth
- user and role APIs
- webhook handling for user sync

### Supabase-Coupled Areas

- `lib/supabase.ts`
- `lib/supabase-admin.ts`
- `lib/supabase-provider.tsx`
- `lib/actions/*`
- `app/api/projects/*`
- `app/api/pledges/*`
- `app/api/transactions/*`
- `app/api/cases/*`
- `app/api/settings/*`
- `app/api/open-ledger-metrics`
- `app/api/marquee-data`
- upload routes and any storage-backed assets

## Deliverables

The migration should produce:

1. An in-house database schema owned by the repository
2. A first-party auth implementation with direct Google sign-in
3. Internal auth, permissions, storage, and repository layers
4. First-run seeding that guarantees at least one `super admin` user exists
5. Full removal of Clerk and Supabase runtime dependencies
6. Data migration scripts and verification tooling
7. Updated deployment and environment documentation

## Risks

1. Role migration errors could create authorization regressions.
2. Ledger and transaction migration errors could create financial inconsistencies.
3. Supabase RPC logic must be reimplemented carefully to avoid behavioral drift.
4. Storage URL migration can break existing public assets if not planned.
5. Session handling changes can affect middleware, SSR, and client hydration behavior.
6. Super admin bootstrap must be safe, deterministic, and not create duplicate privileged users.

## Recommended Next Step

Create the target first-party schema and a file-by-file migration map before implementation begins. That should be the next planning artifact after this document.
