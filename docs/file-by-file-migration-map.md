# File-by-File Migration Map

## Purpose

This document maps the legacy `Clerk` and `Supabase` integration surface in `MORRIS MONYE` to the target in-house architecture.

For each file, it identifies:

1. Current dependency
2. Current responsibility
3. Target replacement
4. Owning workstream
5. Expected migration status

## Status Legend

- `Not Started`
- `In Progress`
- `Blocked`
- `Deferred` — intentionally postponed; see **Notes** for owning workstream and reason
- `Done`
- `Remove`

## Core Platform and Auth

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/layout.tsx` | Clerk (was) | Root auth provider wiring | `AuthSessionProvider` + `getServerSession` / `authOptions` | `03` | `Done` |
| `middleware.ts` | Clerk (was) | Route protection | Auth.js session cookie gate + public method/path rules | `04` | `Done` |
| `lib/clerk.ts` | Clerk (was) | Auth shim | Removed; use `@/lib/auth/server` | `03`, `09` | `Remove` |
| `lib/auth-client.tsx` | Clerk (was) | Client auth support | `next-auth/react` + session helpers | `03` | `Done` |
| `app/(public)/sign-in/[[...sign-in]]/page.tsx` | Clerk (was) | Sign-in UI | Google sign-in via Auth.js | `03` | `Done` |
| `app/(public)/sign-up/[[...sign-up]]/page.tsx` | Clerk (was) | Sign-up UI | Redirect to sign-in / Google | `03` | `Done` |
| `hooks/use-role.tsx` | Clerk (was) | Client role lookup | `useSession` + `useCurrentRole` | `04` | `Done` |

## Core Database and Service Layer

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `lib/supabase.ts` | Supabase (was) | Client DB access | Removed; Prisma + HTTP APIs | `05`, `09` | `Remove` |
| `lib/supabase-admin.ts` | Supabase, Clerk (was) | Server DB bridge | Removed; `@/lib/auth/server` + Prisma | `04`, `05`, `09` | `Remove` |
| `lib/supabase-provider.tsx` | Supabase, Clerk (was) | Client provider | Removed | `03`, `05`, `09` | `Remove` |
| `app/store.ts` | Supabase types (was) | Client profile persistence | Zustand `UserProfile` only (no vendor types) | `03`, `05`, `09` | `Done` |

## Auth-Dependent UI and Dashboard Surfaces

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/(dashboard)/layout.tsx` | Clerk, Supabase (was) | Protected dashboard shell | Auth.js session + internal data | `03`, `04`, `05` | `Done` |
| `app/(dashboard)/admin/layout.tsx` | Clerk (was) | Admin shell auth awareness | Session + roles | `04` | `Done` |
| `app/(dashboard)/dashboard/page.tsx` | Clerk (was) | Dashboard user flow | Session helpers | `03` | `Done` |
| `app/(dashboard)/dashboard/account/page.tsx` | Clerk (was) | Account/profile page | Prisma-backed profile | `03`, `06` | `Done` |
| `app/(dashboard)/dashboard/events/page.tsx` | Clerk (was) | Dashboard events/user state | Session + APIs | `03`, `05` | `Done` |
| `app/(dashboard)/dashboard/voting/page.tsx` | Clerk, Supabase (was) | Voting dashboard reads | `requireAuth` + `voting-service` (Prisma) | `04`, `05`, `06` | `Done` |
| `app/(dashboard)/admin/users/page.tsx` | Clerk (was) | Admin user management | Prisma + admin UI | `05`, `06` | `Done` |
| `app/(dashboard)/admin/cases/case-actions.tsx` | Clerk (was) | User-aware admin case actions | `useSession` + server actions | `04`, `06` | `Done` |
| `app/(public)/pledge/page.tsx` | Clerk (was) | Auth-aware public pledge flow | Session + APIs | `03`, `06` | `Done` |

## User and Role APIs

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/users/route.ts` | Prisma | User listing | `user-repository` | `05` | `Done` |
| `app/api/users/[id]/route.ts` | Supabase (was) | User profile read/update | Prisma `User` / profile fields | `05`, `06` | `Done` |
| `app/api/users/[id]/upload-avatar/route.ts` | Clerk (was) | Avatar upload | `requireAuth` + `lib/storage` + Prisma | `07` | `Done` |
| `app/api/users/[id]/role/route.ts` | Clerk (was) | User role lookup | Prisma `UserRole` | `04`, `05` | `Done` |
| `app/api/assign-role/route.ts` | Clerk (was) | Role assignment | Prisma `UserRole` + `requireRole` | `04`, `06` | `Done` |
| `app/api/dashboard/user/route.ts` | Clerk, Supabase (was) | Current user DB sync | `requireAuth` + Prisma aggregations | `03`, `05`, `06` | `Done` |
| `app/api/webhooks/user/route.ts` | Clerk (was) | Clerk user sync webhook | Removed | `03`, `09` | `Remove` |

## Projects and Public Project Views

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/projects/route.ts` | Supabase (was) | Project listing / create | `listProjects` + `POST` create + voting sync (`09`) | `05`, `06`, `09` | `Done` |
| `app/api/projects/[slug]/route.ts` | Clerk, Supabase (was) | Project detail and writes | Prisma + `requireRole` + voting sync on `PUT` (`09`) | `04`, `05`, `06`, `09` | `Done` |
| `components/components/project-page.tsx` | Supabase (was) | Client-side project data reads | `GET /api/projects` | `05` | `Done` |
| `components/components/project-view.tsx` | Clerk (was) | Auth-aware project view actions | `useCurrentRole` / session | `03`, `04` | `Done` |
| `components/components/project-form.tsx` | Clerk, Supabase (was) | Project create/edit and image flow | `useSession` + `POST/PUT /api/projects` + upload API | `03`, `05`, `06`, `07`, `09` | `Done` |

## Project Timeline APIs and Actions

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/projects/[slug]/timeline/route.ts` | Clerk, Supabase (was) | Timeline CRUD | `requireRole` + `timeline-service` | `04`, `05`, `06` | `Done` |
| `app/api/projects/[slug]/timeline/[stageId]/route.ts` | Clerk, Supabase (was) | Stage update/delete | `requireRole` + `timeline-service` | `04`, `06` | `Done` |
| `app/api/projects/[slug]/timeline/[stageId]/start/route.ts` | Clerk, Supabase (was) | Stage start mutation | `requireAuth` + `startTimelineStage` | `04`, `06` | `Done` |
| `app/api/projects/[slug]/timeline/[stageId]/complete/route.ts` | Clerk, Supabase (was) | Stage completion mutation | `requireAuth` + `completeTimelineStage` | `04`, `06` | `Done` |
| `lib/actions/timeline.ts` | Clerk, Supabase (was) | Timeline domain logic | `timeline-service` + session RBAC | `04`, `05`, `06` | `Done` |

## Pledges, Transactions, Voting, and Ledger

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/pledges/route.ts` | Clerk, Supabase (was) | Pledge reads and writes | `requireRole` / `requireAuth` + `pledge-repository` + `pledge-service` | `04`, `05`, `06` | `Done` |
| `app/api/pledges/export/route.ts` | Clerk, Supabase (was) | Pledge export | `pledge-repository` + `requireRole` | `04`, `05` | `Done` |
| `lib/actions/pledge.ts` | Clerk, Supabase (was) | Pledge business logic | `pledge-service` + Prisma | `04`, `06` | `Done` |
| `app/api/transactions/route.ts` | Clerk, Supabase (was) | Transaction listing | `transaction-repository` + `requireRole` | `04`, `05` | `Done` |
| `app/api/transactions/[id]/route.ts` | Clerk, Supabase (was) | Transaction detail | `requireRole` + repository helpers | `04`, `05`, `06` | `Done` |
| `app/api/transactions/create/route.ts` | Clerk, Supabase (was) | Transaction creation | `requireAuth` + `transaction-write-service` | `04`, `06` | `Done` |
| `app/api/transactions/export/route.ts` | Clerk, Supabase (was) | Transaction export | `transaction-repository` + `requireRole` | `04`, `05` | `Done` |
| `lib/actions/transaction.ts` | Supabase (was) | Transaction query logic | `transaction-repository` | `05`, `06` | `Done` |
| `app/api/voting/route.ts` | Supabase (was) | Voting data reads/writes | `voting-service` (Prisma) | `05`, `06` | `Done` |
| `lib/actions/chart.ts` | Supabase (was) | Financial chart reads/writes | `ledger-account-repository` | `05`, `06` | `Done` |
| `app/api/open-ledger-metrics/route.ts` | Supabase RPC (was) | Public metrics endpoint | `ledger-metrics-repository` | `05` | `Done` |
| `app/api/marquee-data/route.ts` | Supabase RPC (was) | Marquee data endpoint | `getMarqueePayload()` | `05` | `Done` |
| `app/api/public-ledger/route.ts` | N/A (new) | Public ledger JSON for clients | `public-ledger-repository` | `05` | `Done` |
| `hooks/use-public-ledger.ts` | Supabase (was) | Client ledger reads | `/api/public-ledger` polling | `05` | `Done` |

## Cases and Supporting Reference Data

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/cases/create/route.ts` | Clerk, Supabase (was) | Public case creation | `getSession` + `case-intake-service` | `03`, `06` | `Done` |
| `app/api/cases/route.ts` | Clerk, Supabase (was) | Admin case listing | `case-repository` + `requireRole` | `04`, `05` | `Done` |
| `app/api/cases/upload/route.ts` | Supabase Storage (was) | Case file upload | `lib/storage` | `07` | `Done` |
| `lib/actions/cases.ts` | Supabase (was) | Case data and stats | Prisma repositories / services | `05`, `06` | `Done` |
| `app/api/states/route.ts` | Supabase (was) | State lookup | `state-repository` | `05` | `Done` |
| `app/api/states/[state_id]/lgas/route.ts` | Supabase (was) | LGA lookup | `state-repository` | `05` | `Done` |

## Events, Settings, and Utilities

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/events/route.ts` | Supabase (was) | Events read/write | `event-service` | `05`, `06` | `Done` |
| `lib/actions/settings.ts` | Clerk, Supabase (was) | Settings read/write | Prisma + auth helpers | `04`, `05`, `06` | `Done` |
| `lib/utils/settings.ts` | Supabase (was) | Settings utility access | `settings-repository` + cache | `05` | `Done` |
| `lib/actions/index.ts` | Clerk, Supabase (was) | Vote-related server actions | `saveVote` / `canUserVote` + Prisma only (`09`) | `03`–`06`, `09` | `Done` |
| `lib/actions/users.ts` | Clerk, Supabase (was) | User operations | Prisma `User` / `UserRole` + `getSession` | `05`, `06` | `Done` |

## Uploads and Webhooks

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/upload-image/route.ts` | Clerk, Supabase Storage (was) | Image upload | `requireAuth` + `lib/storage` | `07` | `Done` |
| `app/api/webhooks/switchapp/route.ts` | Supabase (was) | Payment webhook side effects | `switchapp-webhook-service` | `06` | `Done` |

## UI Components with Auth-Specific Coupling

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `components/components/header.tsx` | Clerk (was) | User-aware navigation | `useCurrentSession` + sign-in/out helpers | `03` | `Done` |
| `components/components/edit-profile-form.tsx` | Clerk (was) | Profile edits | Session + `lib/actions/users` | `03`, `06` | `Done` |
| `components/components/user-details.tsx` | Clerk (was) | User session display | Session-driven UI | `03` | `Done` |
| `components/components/code-switcher.tsx` | Clerk (was) | Session debug UI | `useCurrentSession` | `03`, `09` | `Done` |
| `components/components/vote-button.tsx` | Clerk (was) | Auth-aware voting action | `useCurrentUser` + `saveVote` | `03`, `06` | `Done` |
| `components/components/dashboard-tab.tsx` | Clerk types (was) | Welcome / dashboard tab | First-party `DashboardUser` prop type | `03`, `09` | `Done` |

## Legacy cleanup (workstream `09`)

| File | Outcome | Notes |
| --- | --- | --- |
| `lib/supabase-provider.tsx` | Deleted | |
| `lib/supabase.ts` | Deleted | |
| `lib/supabase-admin.ts` | Deleted | |
| `lib/clerk.ts` | Deleted | Replaced by `@/lib/auth/server` |
| `app/api/webhooks/user/route.ts` | Deleted | |
| `components/components/clerk-logo.tsx` | Deleted | Unused sample |
| `scripts/migration.js` | Deleted | Old Clerk CSV helper |

## Notes

1. Workstream prompt files live under `docs/transition_workstreams/`.
2. If a file is split during migration, add the new files here and mark the original accordingly.
3. Legacy **export** still targets Supabase **PostgREST** via `fetch` in `scripts/migration/supabase-export.ts` (no `@supabase/supabase-js` in `package.json`).
