# Workstream 08: Data Migration and Verification

## Prompt

You are working on the `MORRIS MONYE` codebase. Build the scripts and verification procedures needed to migrate data from the legacy `Supabase` and `Clerk` setup into the new in-house auth and data model.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

Use the migration map to derive source domains and `00-index.md` to confirm readiness before execution.

## Objective

Create a safe, auditable migration path for production data.

## Scope

1. Export legacy data for:
   - users
   - roles
   - projects
   - pledges
   - transactions
   - votes
   - cases
   - case files
   - settings
   - project timelines
2. Map Clerk identities to internal users.
3. Import normalized data into the new schema.
4. Add verification scripts and consistency checks.

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This workstream depends on `02`, `03`, `05`, `06`, and relevant parts of `07`.
- Preparation can begin earlier, but migration execution should wait for target stability.

### File Ownership from `file-by-file-migration-map.md`

This workstream owns migration tooling across the domains represented in the map, especially:

- users and roles
- projects and timelines
- pledges and transactions
- votes
- cases and files
- settings
- storage-backed assets

## Execution Protocol

1. Derive migration order from identity and foreign key dependencies.
2. Separate export, transform, import, and verify steps.
3. Never guess ambiguous identity matches.
4. Produce logs and reports that make migration auditable.
5. Verify business totals, not only record counts.
6. Verify that at least one valid `super admin` user exists after migration and bootstrap.

## Requirements

1. Use deterministic mapping rules.
2. Produce verifiable import logs.
3. Validate:
   - row counts
   - key foreign key relationships
   - user-role mappings
   - financial totals
   - ledger integrity
   - project funding totals
4. Support dry runs where practical.

## Deliverables

1. Export scripts or procedures
2. Transform and import scripts
3. Verification scripts
4. A runbook in `docs/` for migration execution

## Constraints

1. Do not mutate production data implicitly.
2. Make scripts resumable or at least idempotent where feasible.
3. Flag any ambiguous identity matches instead of guessing.

## Success Criteria

1. Legacy data can be imported into the new schema reliably.
2. Migration correctness can be verified with scripts, not just manual inspection.
3. The team has a repeatable runbook for staging and production migration.
4. Post-migration environments retain or create at least one valid `super admin`.

## Completion Checklist

1. Migration tooling covers all major domains reflected in the migration map.
2. Verification includes auth and financial integrity checks.
3. Dry-run, staging, and production procedures are documented.
4. Ambiguities are listed explicitly for cutover review.

## Expected Output

Provide:

1. The migration scripts added
2. The verification checks implemented
3. Any unresolved data-mapping ambiguities

## Implementation Reference

- Orchestrated CLI: `scripts/migration/cli.ts` (subcommands: `export`, `transform`, `import`, `verify`, `rewrite-urls`).
- Operator runbook: [Production migration runbook](../runbook-production-migration.md).
- npm scripts: `migration:export`, `migration:transform`, `migration:import`, `migration:verify`, `migration:rewrite-urls` in `package.json`.
