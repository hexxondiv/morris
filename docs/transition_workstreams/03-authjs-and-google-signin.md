# Workstream 03: Auth.js and Google Sign-In

## Prompt

You are working on the `MORRIS MONYE` codebase. Implement the new first-party authentication foundation using `Auth.js` with direct `Sign in with Google`.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

Treat the migration map as the file ownership contract and `00-index.md` as the dependency contract.

## Objective

Replace the dependency on `Clerk` authentication primitives with an internally owned auth layer.

## Scope

1. Install and configure `Auth.js`.
2. Add Google OAuth provider support.
3. Create the required auth tables in the new database layer.
4. Implement server-side session helpers.
5. Implement client-side auth/session hooks as needed.
6. Create or replace sign-in UI with a custom page that supports Google sign-in.

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This workstream depends on `02`.
- `04`, parts of `05`, and parts of `06` depend on the session and identity primitives established here.

### File Ownership from `file-by-file-migration-map.md`

Primary ownership:

- `app/layout.tsx`
- `lib/clerk.ts`
- `lib/auth-client.tsx`
- `app/(public)/sign-in/[[...sign-in]]/page.tsx`
- `app/(public)/sign-up/[[...sign-up]]/page.tsx`
- `app/(dashboard)/layout.tsx`
- auth-aware UI files listed in the migration map under dashboard and auth-coupled UI

Secondary coordination:

- `middleware.ts` where new session primitives are consumed by `04`
- `app/api/dashboard/user/route.ts`
- `app/api/webhooks/user/route.ts`

## Execution Protocol

1. Establish the internal session model first.
2. Replace Clerk primitives consistently in each touched flow.
3. Do not leave mixed Clerk and first-party auth assumptions in the same code path.
4. Ensure Google sign-in creates or maps internal user records correctly.
5. Ensure the first bootstrap flow can establish at least one `super admin` account safely.
6. Leave clear handoff notes for files shared with `04`, `05`, or `06`.

## Requirements

1. Support sign-in and session persistence.
2. Persist users through the in-house schema.
3. Ensure roles can be assigned and resolved from internal data, not Clerk metadata.
4. Replace direct `ClerkProvider`, `useAuth`, `useUser`, `auth`, `getAuth`, and `clerkClient` dependencies where appropriate within this scope.
5. Implement secure session handling for App Router usage.
6. Support first-run provisioning or recognition of a seeded `super admin`.

## Deliverables

1. Auth.js configuration
2. Google provider setup
3. Internal auth helper modules
4. Replacement sign-in flow
5. Documentation for required Google OAuth environment variables

## Constraints

1. Do not remove all Clerk code unless the replacement path is complete for the touched flows.
2. Keep changes coherent with the current routing structure.
3. Do not leave mixed auth assumptions in files you modify.

## Success Criteria

1. A user can sign in with Google.
2. The session is readable in server and client contexts.
3. Auth logic no longer depends on Clerk in the converted paths.
4. The auth model can work with the seeded `super admin` bootstrap path.

## Completion Checklist

1. Primary auth files from the migration map are handled or explicitly deferred.
2. Session helpers are reusable by later workstreams.
3. Converted paths no longer rely on Clerk runtime primitives.
4. Remaining Clerk-dependent surfaces are listed explicitly.

## Expected Output

Provide:

1. The auth entry points added or changed
2. The session and role lookup flow
3. Any remaining Clerk-dependent surfaces not covered by this workstream
