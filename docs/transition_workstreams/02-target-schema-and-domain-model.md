# Workstream 02: Target Schema and Domain Model

## Prompt

You are working on the `MORRIS MONYE` codebase. Design and implement the target first-party schema for replacing `Supabase`-managed data access and `Clerk`-managed user metadata with a fully owned relational model.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

Use the migration map to ensure the schema covers all currently implemented product surfaces.

## Objective

Create the canonical database schema and migration structure for the in-house platform.

The target relational database for this plan is `MySQL`, not PostgreSQL.

## Scope

Design the schema for:

1. Users
2. Accounts
3. Sessions
4. Roles and permissions
5. Profiles
6. Projects
7. Project timelines and stages
8. Pledges
9. Transactions
10. Votes
11. Cases
12. Case files
13. Settings
14. Events
15. Audit logs
16. A bootstrap or seed path for at least one `super admin` user

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This workstream is a hard prerequisite for `03`, `05`, `06`, `07`, and `08`.
- Do not optimize the schema only for one flow or one route family.

### File Ownership from `file-by-file-migration-map.md`

This workstream owns the target data model needed by all mapped files under:

- core platform and auth
- core database and service layer
- projects and public project views
- project timeline APIs and actions
- pledges, transactions, voting, and ledger
- cases and supporting reference data
- events, settings, and utilities

## Execution Protocol

1. Model the current business domain before choosing convenience abstractions.
2. Cover all entities implied by the migration map, not just the ones already normalized in Supabase.
3. Record how each current Supabase RPC should be replaced.
4. Keep auth, domain, and audit data coherent under one owned schema strategy.
5. Produce a schema document that downstream workstreams can implement against without redesign.
6. Ensure the schema and seed strategy can safely guarantee at least one `super admin` exists on first bootstrap.

## Requirements

1. Choose and wire up either `Prisma` or `Drizzle`.
2. Create initial schema files and migrations.
3. Model enums explicitly where appropriate.
4. Add foreign keys, indexes, uniqueness rules, and deletion behavior.
5. Preserve current business concepts visible in the existing app.
6. Target `MySQL` explicitly in ORM and migration design.
7. Ensure the schema can support:
   - Google sign-in
   - role-based access control
   - financial ledger views
   - case intake and admin review
   - project lifecycle management
   - safe first-run creation of a `super admin`

## Deliverables

1. ORM configuration
2. Initial schema definition
3. Initial migration files
4. A `docs/` schema overview document
5. Seed strategy notes for local development
6. A defined first-run `super admin` bootstrap or seed mechanism

## Constraints

1. Do not wire all application reads and writes yet unless necessary for validation.
2. Avoid carrying over vendor-specific abstractions into the new schema.
3. If an existing Supabase RPC encapsulates business logic, note how that logic should move into application services or SQL views.

## Success Criteria

1. The repository owns the authoritative schema.
2. The schema covers all currently supported product areas.
3. Future workstreams can use the schema without redesigning core entities.
4. The target schema and seed design safely support at least one initial `super admin`.

## Completion Checklist

1. All major file groups in the migration map are represented in the schema.
2. The schema document is explicit enough for downstream implementation work.
3. RPC replacement strategy is documented where relevant.
4. MySQL is the explicit target across schema and migration artifacts.
5. Index-defined dependencies for later workstreams are unblocked.

## Expected Output

Provide:

1. The ORM selected and why
2. The entity list and major relationships
3. Any business logic that still needs service-layer implementation
