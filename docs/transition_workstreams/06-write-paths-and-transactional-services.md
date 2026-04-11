# Workstream 06: Write Paths and Transactional Services

## Prompt

You are working on the `MORRIS MONYE` codebase. Replace direct `Supabase` mutation logic with transactional application services backed by the new in-house schema and ORM.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

This workstream should align tightly with the repository patterns from `05` and the authorization model from `04`.

## Objective

Move all critical writes to transaction-safe internal services and eliminate vendor-bound mutation logic.

## Scope

Migrate write flows for:

1. User updates and role assignment
2. Project creation and edits
3. Pledges
4. Transactions
5. Votes
6. Cases
7. Case notes
8. Timeline stage changes
9. Settings updates and audit trails

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This workstream depends on `05`.
- It also depends on `04` for sensitive write authorization patterns.
- `08` depends on these write paths stabilizing before data migration execution.

### File Ownership from `file-by-file-migration-map.md`

Primary ownership includes mapped files tagged with `06`, especially:

- `app/api/transactions/create/route.ts`
- `app/api/pledges/route.ts`
- mutation paths in `app/api/projects/[slug]/route.ts`
- `app/api/projects/[slug]/timeline/*`
- `app/api/cases/create/route.ts`
- `app/api/events/route.ts`
- `app/api/webhooks/switchapp/route.ts`
- mutation paths in `app/api/users/[id]/route.ts`
- `lib/actions/pledge.ts`
- `lib/actions/timeline.ts`
- `lib/actions/cases.ts`
- `lib/actions/settings.ts`
- `lib/actions/chart.ts`
- `lib/actions/transaction.ts`
- `lib/actions/users.ts`

## Execution Protocol

1. Move orchestration into service modules first.
2. Use real database transactions for multi-step operations.
3. Preserve validation and authz boundaries established by earlier workstreams.
4. Remove manual rollback logic only when the transactional replacement is complete.
5. Avoid mixed vendor-backed writes within the same domain family.

## Requirements

1. Use database transactions for multi-step operations.
2. Preserve validation and authorization semantics.
3. Remove manual rollback workarounds that existed due to Supabase constraints.
4. Separate orchestration logic from route handlers.

## Deliverables

1. Internal service modules for write flows
2. Refactored route handlers and server actions
3. Audit logging where appropriate
4. Clear error handling and domain-specific failures

## Constraints

1. Do not leave business-critical writes partially on Supabase if the same record family is migrated.
2. Keep route handlers thin.
3. Preserve API compatibility where possible unless a documented change is necessary.

## Success Criteria

1. Converted write paths are transaction-safe.
2. Business logic is centralized in internal services.
3. Converted mutation paths no longer depend on Supabase.

## Completion Checklist

1. Transaction boundaries are explicit.
2. Route handlers are thin and service-driven.
3. Shared ownership with `04`, `05`, and `07` is respected.
4. Remaining vendor-bound write paths are documented for `08` and `09`.

## Expected Output

Provide:

1. The write flows converted
2. The transaction boundaries introduced
3. Any remaining vendor-bound write paths not yet migrated
