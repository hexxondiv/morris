# Workstream 01: Security and Environment Hardening

## Prompt

You are working on the `MORRIS MONYE` codebase. Execute the security and environment hardening workstream required before the migration from `Clerk` and `Supabase` to an in-house auth and model-management stack begins.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

Use `00-index.md` as the sequencing authority and `file-by-file-migration-map.md` as the scope and ownership reference.

## Objective

Remove immediate operational risk, especially around exposed credentials and vendor-specific environment assumptions, without breaking the current app.

This workstream must also rewrite `.env.example` so it contains only relevant current-runtime variables and clearly justified transition-target variables.

## Scope

1. Audit `.env.example` and any checked-in files for real or real-looking secrets.
2. Replace all real credentials in `.env.example` with safe placeholders.
3. Normalize environment variable naming for the upcoming transition.
4. Add comments separating:
   - current legacy vendor variables
   - transitional variables
   - target in-house stack variables
5. Preserve current runtime behavior where possible.
6. Remove irrelevant, duplicate, stale, or unjustified environment entries from `.env.example`.

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This is the first required execution workstream.
- Downstream workstreams should assume this workstream establishes the safe environment baseline.

### File Ownership from `file-by-file-migration-map.md`

Primary ownership:

- `.env.example`
- environment setup documentation in `docs/`

Secondary audit ownership:

- any mapped file containing hardcoded vendor URLs, secrets, or environment assumptions

## Execution Protocol

1. Audit first, patch second.
2. Replace unsafe sample values with placeholders.
3. Preserve legacy variable compatibility unless call sites are updated safely.
4. Introduce transitional and target-stack variables in clearly separated sections.
5. Remove environment entries that are no longer relevant, duplicated, misleading, or not justified by either the current runtime or the planned transition.
6. Document every residual risk you choose not to remediate in this workstream.

## Required Deliverables

1. A sanitized `.env.example`
2. A short environment variable reference document in `docs/`
3. Clear placeholder variables for:
   - Google OAuth
   - Auth.js
   - MySQL
   - S3 or R2 storage
   - payment provider secrets
4. A brief summary of any files that appear to contain hardcoded production-facing URLs or vendor-specific assumptions
5. An `.env.example` that contains only relevant current and transition-approved variables

## Constraints

1. Do not remove currently used variables unless the app is also updated safely.
2. Do not break local development.
3. Do not implement the full migration in this workstream.
4. If you find active secrets checked into other files, document them and replace them when safe.

## Success Criteria

1. No real secrets remain in tracked sample env files.
2. The repository has a migration-ready environment structure.
3. The app can still boot with the current legacy stack.
4. `.env.example` contains only variables relevant to the current runtime or the approved transition target.

## Completion Checklist

1. The sequencing constraints in `00-index.md` were respected.
2. Environment changes are compatible with current runtime expectations.
3. All risky sample credentials are removed or explicitly documented as blockers.
4. New variables required by future workstreams are named and documented clearly.
5. Irrelevant or stale env entries are removed from `.env.example`.

## Expected Output

Provide:

1. The files changed
2. The exact categories of variables introduced or renamed
3. Which variables were removed as irrelevant or stale
4. Any residual security risks still present after this workstream
