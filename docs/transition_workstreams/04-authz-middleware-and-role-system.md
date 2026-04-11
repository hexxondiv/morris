# Workstream 04: Authorization, Middleware, and Role System

## Prompt

You are working on the `MORRIS MONYE` codebase. Replace the current `Clerk`-based authorization and middleware model with a first-party role and route protection system backed by internal session and role data.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

Use the migration map to identify all route- and role-sensitive files.

## Objective

Make route access, API access, and admin restrictions depend on the new in-house auth system.

## Scope

1. Replace `middleware.ts` route protection logic.
2. Implement internal helpers for:
   - `requireAuth`
   - `requireRole`
   - `getCurrentUser`
   - `isAuthorized`
3. Migrate role lookups out of Clerk metadata and into the database.
4. Update protected API routes and server actions to use the new permission model.

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This workstream depends on `03`.
- `06` depends on this workstream for final write-path authorization semantics.

### File Ownership from `file-by-file-migration-map.md`

Primary ownership:

- `middleware.ts`
- authorization-related portions of `lib/clerk.ts` replacement
- `hooks/use-role.tsx`
- `app/(dashboard)/admin/layout.tsx`
- `app/api/users/[id]/role/route.ts`
- `app/api/assign-role/route.ts`

Shared ownership:

- all mapped files tagged with `04`

## Execution Protocol

1. Centralize permission logic before route-by-route conversion.
2. Resolve roles from internal data only.
3. Enforce sensitive checks on the server.
4. In shared files, limit changes to authz boundaries if data migration belongs to `05` or `06`.
5. Document unresolved protected routes explicitly.

## Requirements

1. Preserve current protected/public route intent.
2. Support user, admin, and any existing higher-privilege roles.
3. Ensure server-only permission checks exist for sensitive actions.
4. Keep the authorization model readable and centralized.

## Deliverables

1. New middleware implementation
2. Internal authorization helpers
3. Role persistence model integration
4. Updated auth checks in representative API routes and server actions

## Constraints

1. Do not rely on client-only role checks for sensitive operations.
2. Avoid duplicating permission logic across many files.
3. If some routes cannot be migrated yet, isolate and document them.

## Success Criteria

1. Protected routes still behave correctly.
2. Admin and user boundaries are enforced by internal logic.
3. Clerk middleware and Clerk role metadata are no longer required in converted areas.

## Completion Checklist

1. Middleware no longer depends on Clerk in converted paths.
2. Shared permission helpers are in place.
3. Shared-file ownership with `05` and `06` remains clear.
4. Remaining route families pending migration are documented.

## Expected Output

Provide:

1. The new role resolution path
2. The middleware behavior
3. Any endpoints still pending authorization migration
