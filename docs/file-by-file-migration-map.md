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
- `Done`
- `Remove`

## Core Platform and Auth

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/layout.tsx` | Clerk | Root auth provider wiring | Auth.js session provider or first-party auth wrapper | `03` | Not Started |
| `middleware.ts` | Clerk | Route protection | First-party session-aware middleware | `04` | Not Started |
| `lib/clerk.ts` | Clerk | Auth and role helpers | `lib/auth/*` and `lib/permissions/*` | `03`, `04` | Not Started |
| `lib/auth-client.tsx` | Clerk | Client auth support | First-party session client utilities | `03` | Not Started |
| `app/(public)/sign-in/[[...sign-in]]/page.tsx` | Clerk | Sign-in UI | Custom sign-in page with Google sign-in | `03` | Not Started |
| `app/(public)/sign-up/[[...sign-up]]/page.tsx` | Clerk | Sign-up UI | Redirect or merged sign-in flow via Google | `03` | Not Started |
| `hooks/use-role.tsx` | Clerk | Client role lookup | Internal session and role hook | `04` | Not Started |

## Core Database and Service Layer

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `lib/supabase.ts` | Supabase | Client DB access | `lib/db`, repositories, or API-backed client hooks | `05`, `09` | In Progress | Client bundle still imported by workstream `06/07`-deferred surfaces (e.g. `project-form.tsx`) until those paths migrate. |
| `lib/supabase-admin.ts` | Supabase, Clerk | Server DB access and auth bridge | ORM client plus internal authz helpers | `04`, `05`, `09` | In Progress | Read paths in scope for `05` moved to Prisma; `ensureAuthorized`, Clerk bridge, and `saveVote` sync still use the admin client. |
| `lib/supabase-provider.tsx` | Supabase, Clerk | Client provider for user DB state | Remove or replace with internal state/provider | `03`, `05`, `09` | Not Started |
| `app/store.ts` | Supabase, Clerk | Client state typing for profile/session | Internal auth/user state model | `03`, `05` | Not Started |

## Auth-Dependent UI and Dashboard Surfaces

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/(dashboard)/layout.tsx` | Clerk, Supabase | Protected dashboard shell | Internal auth wrapper and internal data access | `03`, `04`, `05` | Not Started |
| `app/(dashboard)/admin/layout.tsx` | Clerk | Admin shell auth awareness | Internal session and role handling | `04` | Not Started |
| `app/(dashboard)/dashboard/page.tsx` | Clerk | Dashboard user flow | Internal session helpers | `03` | Not Started |
| `app/(dashboard)/dashboard/account/page.tsx` | Clerk | Account/profile page | Internal user profile model | `03`, `06` | Not Started |
| `app/(dashboard)/dashboard/events/page.tsx` | Clerk | Dashboard events/user state | Internal session model | `03`, `05` | Not Started |
| `app/(dashboard)/dashboard/voting/page.tsx` | Clerk, Supabase | Voting dashboard reads | Internal auth + ORM reads | `04`, `05` | Not Started |
| `app/(dashboard)/admin/users/page.tsx` | Clerk | Admin user management | Internal users repository and admin UI | `05`, `06` | Not Started |
| `app/(dashboard)/admin/cases/case-actions.tsx` | Clerk | User-aware admin case actions | Internal session and role model | `04`, `06` | Not Started |
| `app/(public)/pledge/page.tsx` | Clerk | Auth-aware public pledge flow | Internal auth/session handling | `03`, `06` | Not Started |

## User and Role APIs

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/users/route.ts` | Clerk (was), Prisma | User listing | ORM-backed user listing | `05` | Done | Admin list now reads `users` + `user_roles` via `user-repository`; Clerk remains for role mutations in `lib/actions/users.ts` (`06`). |
| `app/api/users/[id]/route.ts` | Supabase | User profile read/update | Internal repository and service layer | `05`, `06` | Not Started |
| `app/api/users/[id]/upload-avatar/route.ts` | Clerk | Avatar upload to Clerk | Internal storage and profile update flow | `07` | Not Started |
| `app/api/users/[id]/role/route.ts` | Clerk | User role lookup | Internal role repository | `04`, `05` | Not Started |
| `app/api/assign-role/route.ts` | Clerk | Role assignment via Clerk metadata | Internal role assignment service | `04`, `06` | Not Started |
| `app/api/dashboard/user/route.ts` | Clerk, Supabase | Current user DB sync | Internal session + internal user repository | `03`, `05`, `06` | Not Started |
| `app/api/webhooks/user/route.ts` | Clerk, Supabase | Clerk user sync webhook | Remove after internal auth is live | `03`, `09` | Remove |

## Projects and Public Project Views

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/projects/route.ts` | Supabase | Project listing | ORM repository query | `05` | Done | Uses `project-repository` (`listProjects`). |
| `app/api/projects/[slug]/route.ts` | Clerk, Supabase | Project detail and auth-aware access | Internal auth + repository/service reads and writes | `04`, `05`, `06` | Done | GET/PUT use Prisma repositories + `getSession` / `requireRole`; timeline mutations remain other routes (`06`). |
| `components/components/project-page.tsx` | Supabase | Client-side project data reads | API-backed or repository-backed server flow | `05` | Done | Lists via `GET /api/projects` (no Supabase import). |
| `components/components/project-view.tsx` | Clerk | Auth-aware project view actions | Internal session hook/helpers | `03`, `04` | Not Started |
| `components/components/project-form.tsx` | Clerk, Supabase | Project create/edit and image flow | Internal auth, repositories, storage adapter | `03`, `05`, `06`, `07` | Blocked | Explicit `06/07` boundary comment: still uses Supabase for reads/writes until transactional services. |

## Project Timeline APIs and Actions

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/projects/[slug]/timeline/route.ts` | Clerk, Supabase | Timeline CRUD | Internal authz + transactional services | `04`, `05`, `06` | Not Started |
| `app/api/projects/[slug]/timeline/[stageId]/route.ts` | Clerk, Supabase | Stage update/delete | Internal authz + transactional services | `04`, `06` | Not Started |
| `app/api/projects/[slug]/timeline/[stageId]/start/route.ts` | Clerk, Supabase | Stage start mutation | Internal authz + transactional service | `04`, `06` | Not Started |
| `app/api/projects/[slug]/timeline/[stageId]/complete/route.ts` | Clerk, Supabase | Stage completion mutation | Internal authz + transactional service | `04`, `06` | Not Started |
| `lib/actions/timeline.ts` | Clerk, Supabase | Timeline domain logic | Internal service layer | `04`, `05`, `06` | Not Started |

## Pledges, Transactions, Voting, and Ledger

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/pledges/route.ts` | Clerk, Supabase | Pledge reads and writes | Internal auth + repositories + transactional services | `04`, `05`, `06` | Not Started |
| `app/api/pledges/export/route.ts` | Clerk, Supabase | Pledge export | Internal authz + ORM query/export | `04`, `05` | Done | `pledge-repository` + `requireRole`. |
| `lib/actions/pledge.ts` | Clerk, Supabase | Pledge business logic | Transactional service layer | `04`, `06` | Not Started |
| `app/api/transactions/route.ts` | Clerk, Supabase | Transaction listing | Internal authz + ORM query | `04`, `05` | Done | `transaction-repository` + `requireRole`. |
| `app/api/transactions/[id]/route.ts` | Clerk, Supabase | Transaction detail | Internal authz + ORM query | `04`, `05` | Deferred | **PATCH only** today; still uses Supabase for status updates until `06` (`transaction-repository` write helpers). |
| `app/api/transactions/create/route.ts` | Clerk, Supabase | Transaction creation | Internal authz + transactional service | `04`, `06` | Not Started |
| `app/api/transactions/export/route.ts` | Clerk, Supabase | Transaction export | Internal authz + ORM query/export | `04`, `05` | Done | `transaction-repository` export list. |
| `lib/actions/transaction.ts` | Supabase | Transaction query logic | Internal repository/service layer | `05`, `06` | Done | Server actions call `transaction-repository`. |
| `app/api/voting/route.ts` | Supabase | Voting data reads/writes | Internal repository and services | `05`, `06` | Not Started |
| `lib/actions/chart.ts` | Supabase | Financial chart/category reads and writes | Internal repository/service layer | `05`, `06` | Done | Maps legacy `charts` reads/writes to `ledger_accounts` via `ledger-account-repository`. |
| `app/api/open-ledger-metrics/route.ts` | Supabase RPC | Public metrics endpoint | Service-layer aggregation or SQL view under internal DB ownership | `05` | Done | `ledger-metrics-repository` (approximate aggregate; see `05-data-access-repositories-and-read-migration.md` RPC notes). |
| `app/api/marquee-data/route.ts` | Supabase RPC | Marquee data endpoint | Internal query/service implementation | `05` | Done | Returns `{ items, default_currency }` via `getMarqueePayload()`. |
| `app/api/public-ledger/route.ts` | N/A (new) | Public ledger JSON for clients | Prisma-backed `public-ledger-repository` | `05` | Done | Added for `hooks/use-public-ledger.ts` (polling). |
| `hooks/use-public-ledger.ts` | Supabase | Client ledger reads and realtime | Internal API polling or owned realtime strategy | `05` | Done | Fetches `/api/public-ledger`; Supabase realtime removed. |

## Cases and Supporting Reference Data

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/cases/create/route.ts` | Clerk, Supabase | Public case creation | Internal auth + transactional service | `03`, `06` | Not Started |
| `app/api/cases/route.ts` | Clerk, Supabase | Admin case listing | Internal authz + repository query | `04`, `05` | Done | `case-repository` + `requireRole`. |
| `app/api/cases/upload/route.ts` | Supabase Storage | Case file upload | Internal storage adapter | `07` | Not Started |
| `lib/actions/cases.ts` | Supabase | Case data and stats | Internal repositories/services | `05`, `06` | Done | Reads and case admin mutations use Prisma (`case-repository` / `prisma`); align with `06` for transactional review flows if needed. |
| `app/api/states/route.ts` | Supabase | State lookup | Internal repository query | `05` | Done | `state-repository`. |
| `app/api/states/[state_id]/lgas/route.ts` | Supabase | LGA lookup | Internal repository query | `05` | Done | `state-repository`. |

## Events, Settings, and Utilities

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/events/route.ts` | Supabase | Events read/write | Internal repository/service layer | `05`, `06` | Not Started |
| `lib/actions/settings.ts` | Clerk, Supabase | Settings read/write and validation | Internal authz + repositories + audit services | `04`, `05`, `06` | Done | Prisma `settings` + `getCurrentUser` / `getPrimaryRole` for access checks; audit polish in `06`. |
| `lib/utils/settings.ts` | Supabase | Settings utility access | Internal repository/service access | `05` | Done | Uses `settings-repository` + cache. |
| `lib/actions/index.ts` | Clerk, Supabase | Mixed helper queries and role lookups | Split into internal auth and data modules | `03`, `04`, `05` | In Progress | Project reads + `canUserVote` eligibility use Prisma; `saveVote` + `syncRole(s)` still touch Supabase (`06` boundary). |
| `lib/actions/users.ts` | Clerk, Supabase | User operations | Internal repository/service layer | `05`, `06` | In Progress | `getTotalUserCount` / dev profile use Prisma; Clerk remains for admin mutations. |

## Uploads and Webhooks

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `app/api/upload-image/route.ts` | Clerk, Supabase Storage | Project or general image upload | Internal auth + storage adapter | `07` | Not Started |
| `app/api/webhooks/switchapp/route.ts` | Supabase | Payment webhook side effects | Internal transactional services | `06` | Not Started |

## UI Components with Auth-Specific Coupling

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `components/components/header.tsx` | Clerk | User-aware navigation | Internal session-aware navigation | `03` | Not Started |
| `components/components/edit-profile-form.tsx` | Clerk | Profile edits | Internal auth/session and profile service | `03`, `06` | Not Started |
| `components/components/user-details.tsx` | Clerk | User session display | Internal session model | `03` | Not Started |
| `components/components/code-switcher.tsx` | Clerk | Session/org example UI | Refactor or remove | `03`, `09` | Not Started |
| `components/components/vote-button.tsx` | Clerk | Auth-aware voting action | Internal auth/session hook and service | `03`, `06` | Not Started |

## Legacy Cleanup Candidates

These should be removed once all replacements are complete.

| File | Current Dependency | Responsibility | Target Replacement | Workstream | Status |
| --- | --- | --- | --- | --- | --- |
| `lib/supabase-provider.tsx` | Supabase, Clerk | Legacy provider | Remove after migration | `09` | Not Started |
| `lib/supabase.ts` | Supabase | Legacy client | Remove after migration | `09` | Not Started |
| `lib/supabase-admin.ts` | Supabase, Clerk | Legacy admin bridge | Remove after migration | `09` | Not Started |
| `lib/clerk.ts` | Clerk | Legacy auth helper | Remove after migration | `09` | Not Started |
| `app/api/webhooks/user/route.ts` | Clerk | Legacy Clerk webhook | Remove after migration | `09` | Not Started |

## Notes

1. This map should be updated as workstreams begin. Workstream prompt files now live under `docs/transition_workstreams/`.
2. If a file is split during migration, add the new files here and mark the original accordingly.
3. If a responsibility moves from route handlers into services, the route should still remain listed until fully converted.
