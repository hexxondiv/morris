# Transition Workstreams Index

## Purpose

This index explains:

1. Workstream sequencing
2. Dependency order
3. Which workstreams can run in parallel
4. What must be completed before cutover

Use this alongside:

- [Migration Plan](/var/www/html/morris/docs/clerk-supabase-migration-plan.md)
- [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)

## Workstream List

1. `01-security-environment-hardening`
2. `02-target-schema-and-domain-model`
3. `03-authjs-and-google-signin`
4. `04-authz-middleware-and-role-system`
5. `05-data-access-repositories-and-read-migration`
6. `06-write-paths-and-transactional-services`
7. `07-storage-and-file-migration`
8. `08-data-migration-and-verification`
9. `09-cutover-cleanup-and-dependency-removal`

## Status Tracker

Use this table to track execution status across workstreams.

Allowed status values:

- `Not Started`
- `In Progress`
- `Blocked`
- `Done`

| Workstream | Title | Status | Depends On | Can Run In Parallel With | Notes |
| --- | --- | --- | --- | --- | --- |
| `01` | Security and Environment Hardening | `Done` | None | None | Sanitized `.env.example` and added `docs/environment-reference.md` |
| `02` | Target Schema and Domain Model | `Done` | `01` | None | MySQL Prisma schema, initial migration, RPC mapping, and deterministic super admin bootstrap are committed |
| `03` | Auth.js and Google Sign-In | `Not Started` | `02` | parts of `05` | Must establish session, identity, and super admin-compatible auth flow |
| `04` | Authorization, Middleware, and Role System | `Not Started` | `03` | parts of `05` | Should not begin until core auth/session primitives are stable |
| `05` | Data Access Layer and Read Migration | `Not Started` | `02` | parts of `03`, `04`, `07` | Defines repository and query patterns reused by `06` |
| `06` | Write Paths and Transactional Services | `Not Started` | `04`, `05` | parts of `07` | Must use internal transactions and final authz rules |
| `07` | Storage and File Migration | `Not Started` | `02` | `05`, later `06` | Must coordinate with write flows where file metadata is transactional |
| `08` | Data Migration and Verification | `Not Started` | `02`, `03`, `05`, `06`, relevant `07` | final stabilization work only | Can prepare earlier, but execution waits for target stability |
| `09` | Cutover, Cleanup, and Dependency Removal | `Not Started` | `03`, `04`, `05`, `06`, `07`, `08` | None | Final state requires no Clerk or Supabase dependencies and a working system |

## Required Sequence

### Phase A: Foundation

Must happen first:

1. `01-security-environment-hardening`
2. `02-target-schema-and-domain-model`

Reason:

- `01` removes immediate security risk and prepares environment structure.
- `02` defines the canonical target database and auth model that every later workstream depends on.

### Phase B: Auth Foundation

Starts after `02`:

3. `03-authjs-and-google-signin`
4. `04-authz-middleware-and-role-system`

Reason:

- `03` creates the new identity and session layer.
- `04` depends on `03` because authorization and middleware must use the new session and role model.

### Phase C: Domain Migration

Starts after `02`, with partial dependency on `03` and `04`:

5. `05-data-access-repositories-and-read-migration`
6. `06-write-paths-and-transactional-services`
7. `07-storage-and-file-migration`

Reason:

- `05` depends primarily on the new schema from `02`.
- `06` depends on `05` for repositories and should also align with `04` for authz-sensitive writes.
- `07` can start once the target storage strategy and relevant schema expectations are clear.

### Phase D: Migration and Cutover

Starts after the core domain migration is substantially complete:

8. `08-data-migration-and-verification`
9. `09-cutover-cleanup-and-dependency-removal`

Reason:

- `08` needs stable target schema, auth model, and core repositories/services.
- `09` should only begin once migrated flows are working and verified.

## Dependency Graph

### Hard Dependencies

- `02` depends on `01`
- `03` depends on `02`
- `04` depends on `03`
- `05` depends on `02`
- `06` depends on `05`
- `06` also depends on `04` for finalized authz patterns on sensitive writes
- `08` depends on `02`, `03`, `05`, `06`, and relevant parts of `07`
- `09` depends on `03`, `04`, `05`, `06`, `07`, and `08`

### Soft Dependencies

- `07` should align with `06` where file metadata is part of write transactions
- `05` should coordinate with `03` where read paths expose current-user context
- `05` should coordinate with `04` where reads are permission-filtered

## Parallelization Guidance

### Can Run in Parallel

After `02` is complete:

- `03` and early planning for `05`
- `05` and `07`
- portions of `05` and planning for `06`

After `03` is stable:

- `04` and `05`

After `05` has established repositories:

- `06` and `07`

During late-stage validation:

- `08` preparation can begin while final `06` and `07` work is wrapping up, but actual migration execution should wait

### Should Not Run in Parallel Without Coordination

- `03` and `04` on the same auth/session files without clear ownership
- `05` and `06` on the same route or action files without a defined boundary
- `06` and `08` on live migration scripts before write-path behavior stabilizes
- `09` with any workstream that still depends on legacy imports

## Recommended Execution Model

### Team 1: Foundation and Auth

- `01`
- `02`
- `03`
- `04`

### Team 2: Data and Services

- `05`
- `06`

### Team 3: Storage and Migration Tooling

- `07`
- `08`

### Final Integration

- `09`

## Suggested Handoffs

1. `01` hands off sanitized env structure to all later workstreams.
2. `02` hands off canonical schema and entity definitions to `03`, `05`, `06`, `07`, and `08`.
3. `03` hands off session and user primitives to `04`, `05`, and `06`.
4. `04` hands off permission helpers to `05` and `06`.
5. `05` hands off repositories and read-side service patterns to `06`.
6. `06` and `07` hand off stable write and storage semantics to `08`.
7. `08` signs off data verification readiness before `09`.

## Definition of Ready for Cutover

Before `09` begins, all of the following should be true:

1. Google sign-in works in the target environment.
2. Role checks no longer depend on Clerk metadata.
3. Core read paths no longer depend on Supabase.
4. Core write paths no longer depend on Supabase.
5. File upload flows no longer depend on Supabase Storage.
6. First-run bootstrap or seeding creates at least one valid `super admin` user.
7. Data migration scripts and verification scripts exist.
8. Staging verification has been completed.

## Definition of Done

The transition is complete only when:

1. No production code imports `Clerk`.
2. No production code imports `Supabase`.
3. Middleware, auth, data access, storage, and role checks all use first-party infrastructure.
4. At least one `super admin` user is seeded on first bootstrap in a safe and repeatable way.
5. The full system works correctly end to end after Clerk and Supabase removal.
6. The repository documentation matches the new architecture.
7. Legacy env variables, webhook flows, and compatibility shims are removed or explicitly retired.
