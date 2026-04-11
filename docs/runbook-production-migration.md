# Runbook: Production Data Migration (Workstream 08)

This runbook describes how to move **legacy Supabase** domain data (and optional **Clerk** verification exports) into the **Prisma / MySQL** target schema, then verify integrity. It aligns with `docs/transition_workstreams/08-data-migration-and-verification.md`, `docs/target-schema-overview.md`, and `docs/environment-reference.md`.

Application request handlers **must not** perform production migration writes. Use the CLI under `scripts/migration/` only.

## What Is Covered vs Deferred

| Domain | Covered by tooling | Notes |
| --- | --- | --- |
| Users / profiles | Yes | Legacy `profiles.id` (Clerk user id) → deterministic `users.id` (UUID v5). |
| Roles (`UserRole`) | Yes | Mapped from legacy `profiles.role` string to Prisma `roles.key`. |
| Projects | Yes | Preserves legacy UUID `projects.id`. Skips rows without a mapped creator. |
| Project timelines | Partial | If legacy has no `project_timelines` table/rows, import creates one **ACTIVE** timeline v1 per project (no stages). Stage/media migration is a follow-up if legacy stages exist elsewhere. |
| Voting periods | Yes | |
| Pledges | Yes | |
| Transactions | Yes | `projectId` taken from `metadata.projectId` when present. `ledger_account_id` may be null until reconciled. |
| Votes | Yes | Legacy boolean `vote` → `SUPPORT` / `OPPOSE`. |
| Settings | Yes | Legacy string `value` parsed as JSON when possible; otherwise stored as a string JSON value with `legacy_import` category. |
| Storage URLs | Optional pass | `rewrite-urls` subcommand when `S3_PUBLIC_BASE_URL` (workstream 07) replaces Supabase public object URLs. |
| Cases / case files | **Deferred** | Not in checked-in `supabase/remote_schema.sql`. If your production Supabase has `cases` / `case_files`, extend export + transform in a follow-up PR or import via a separate one-off script after schema alignment. |
| Events | Export only | Optional `events.json` from export; **import not implemented** in v1 CLI (low risk / can be added similarly to settings). |
| Clerk removal / Supabase client removal | **Workstream 09** | Optional Clerk JSON is read **offline** for verification only; no Clerk API calls in this tooling. |

## Prerequisites

1. **MySQL** target reachable via `DATABASE_URL`.
2. **Schema** applied: `npx prisma migrate deploy`.
3. **Roles and permissions catalog** present: `npm run db:seed` (required before `import` so `UserRole` assignments resolve).
4. **Super admin**: After import, verification expects at least one `super_admin` in `user_roles`. Either:
   - run `npm run db:bootstrap-super-admin` with `BOOTSTRAP_SUPER_ADMIN_EMAIL` / `BOOTSTRAP_SUPER_ADMIN_NAME` set (see `prisma/seed.ts`), **using an email not colliding with legacy imports**, or  
   - assign `super_admin` manually in a controlled DBA session.  
   Legacy Supabase `profiles.role` did not include `super_admin` in the DB check constraint; do not assume it appears in exports.

## Environment Variables

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` or `LEGACY_SUPABASE_URL` | Export source |
| `SUPABASE_SERVICE_ROLE_KEY` or `LEGACY_SUPABASE_SERVICE_ROLE_KEY` | Export (service role) |
| `DATABASE_URL` | Import + verify |
| `MIGRATION_ALLOW_REIMPORT=1` | Bypass the one-time `audit_logs` marker when re-running import (use with care) |
| `BOOTSTRAP_SUPER_ADMIN_EMAIL` / `BOOTSTRAP_SUPER_ADMIN_NAME` | Bootstrap (post-migration) |
| `S3_PUBLIC_BASE_URL` | Documented for URL rewrite coordination with workstream 07 (optional `rewrite-urls`) |

## Identity Rules (Deterministic, No Silent Merge)

1. **Primary mapping**: legacy `profiles.id` (Clerk user id) → `users.id = uuidV5("clerk_profile_id:" + profiles.id)` using the fixed namespace in `scripts/migration/uuidv5.ts`. **Changing the namespace breaks idempotency.**
2. **Email normalization**: lowercased trimmed email on import.
3. **Duplicate legacy emails**: transform keeps the **first** profile row order from `profiles.json` and skips subsequent rows with the same email; ambiguities are logged. Resolve in source data or supply an **identity map** (below).
4. **Optional Clerk export** (`--clerk-export`): JSON array of `{ id, primary_email_address, ... }`. If Clerk primary email **differs** from Supabase `profiles.email` for the same `id`, that user is **skipped** (not guessed).
5. **Manual overrides** (`--identity-map`): JSON file shape:
   ```json
   {
     "userIdByLegacyProfileId": { "user_xxx": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
     "userIdByEmail": { "someone@example.com": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
   }
   ```
   Values must be existing **36-character** UUIDs you intend to own those identities. **Never** use overrides to silently merge two real people.

## Pipeline Order (FK-Safe)

1. **Export** (legacy): `profiles` → drives all Clerk-id foreign keys; then `projects`, `voting_periods`, `pledges`, `transactions`, `votes`, `settings`, optional tables.
2. **Transform**: deterministic users + normalized payloads + `manifest.json`.
3. **Optional** `rewrite-urls`: if public object host changed vs legacy Supabase URLs.
4. **Import** (target): `users` + `profiles` + `user_roles` → `projects` → default `project_timelines` → `voting_periods` → `pledges` → `transactions` → `votes` → `settings` → audit marker `migration/legacy_import_completed`.
5. **Bootstrap super admin** (if not already satisfied): `npm run db:bootstrap-super-admin`.
6. **Verify**: counts, FK probes, role coverage, financial aggregates vs `manifest.json` (within tolerance).

## Commands

Replace paths with your own work directories (e.g. under `/tmp` or an operator laptop).

### 1) Export (dry connectivity; writes JSON only)

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

npm run migration:export -- --out-dir ./migration-work/export
```

### 2) Transform

```bash
npm run migration:transform -- \
  --export-dir ./migration-work/export \
  --out-dir ./migration-work/transformed
```

With optional Clerk + identity files:

```bash
npm run migration:transform -- \
  --export-dir ./migration-work/export \
  --out-dir ./migration-work/transformed \
  --clerk-export ./migration-work/clerk-users.json \
  --identity-map ./migration-work/identity-map.json
```

### 3) Optional URL rewrite (Supabase storage → CDN / R2)

Only when you have a stable string prefix replacement (coordinate with workstream 07 `S3_PUBLIC_BASE_URL`):

```bash
npm run migration:rewrite-urls -- \
  --transform-dir ./migration-work/transformed \
  --from-prefix "https://YOURPROJECT.supabase.co/storage/v1/object/public/" \
  --to-prefix "https://cdn.example.com/" \
  --out-dir ./migration-work/transformed-rewritten
```

Omit `--out-dir` to rewrite files in place.

### 4) Import (live)

Ensure `npm run db:seed` has been executed on the target database.

```bash
export DATABASE_URL="mysql://..."

npm run migration:import -- --transform-dir ./migration-work/transformed
```

**Dry-run** (no writes; validates files and prints row counts):

```bash
npm run migration:import -- --transform-dir ./migration-work/transformed --dry-run
```

**Re-import**: by default a second import **aborts** if audit marker `legacy_import_completed` exists. Set `MIGRATION_ALLOW_REIMPORT=1` only after DBA review.

**JSON report** (stdout + file):

```bash
npm run migration:import -- \
  --transform-dir ./migration-work/transformed \
  --report-json ./migration-work/reports/import-report.json
```

### 5) Verify (CI / staging gate; exit code 0 = pass)

```bash
export DATABASE_URL="mysql://..."

npm run migration:verify -- \
  --export-dir ./migration-work/export \
  --transform-dir ./migration-work/transformed \
  --tolerance 0.01 \
  --report-json ./migration-work/reports/verify-report.json
```

Tolerance applies to **financial sum** comparisons (currency NGN assumed consistent).

## Staging vs Production

- **Staging**: run the full sequence on a database restored from a recent anonymized snapshot; keep export + transform artifacts in versioned object storage for audit.
- **Production**: freeze writes on legacy where possible; take a final export; repeat transform/import during a maintenance window; run verify; keep reports.

## Rollback Posture

- **Preferred**: restore MySQL from a **pre-import snapshot** (or recreate empty schema + `prisma migrate deploy` + `db:seed`).
- **Partial**: delete rows by domain in reverse FK order (high risk); the audit log row with `entityType = "migration"` / `action = "legacy_import_completed"` documents that an import completed.
- **Forward fix**: use `MIGRATION_ALLOW_REIMPORT=1` only with a reviewed transform directory; never mix unreviewed exports.

## Auditing

- CLI logs batch summaries to stdout.
- Optional `--report-json` writes reconciliation metadata (`MigrationReport` + verify exit code).
- Import writes `audit_logs` with `action = "legacy_import_completed"`.

## Known Ambiguities (Surfaced, Not Guessed)

- Clerk vs Supabase email mismatch for the same user id → user skipped in transform.
- Duplicate emails in legacy profiles → only first wins; others skipped.
- Projects whose `creator_id` does not map to an emitted user → skipped with explicit import errors.
- Global financial sums in verify compare **legacy export manifest** to **entire** current DB totals; if the database already contains non-legacy rows, widen `--tolerance` or use a dedicated empty verification database.

## Schema Gap (Minimal Follow-Up)

- **Transactions without `ledger_account_id`**: legacy Postgres `transactions` has no ledger chart FK. Imports leave `ledger_account_id` null. A small follow-up could map `metadata` chart codes to `ledger_accounts.id` once a definitive legacy→ledger dictionary exists (suggested: extend `transform.ts` with an optional `ledger-map.json`).

## npm Script Shorthand

| Script | Maps to |
| --- | --- |
| `npm run migration:export` | `tsx scripts/migration/cli.ts export` |
| `npm run migration:transform` | `... transform` |
| `npm run migration:import` | `... import` |
| `npm run migration:verify` | `... verify` |
| `npm run migration:rewrite-urls` | `... rewrite-urls` |

Pass `--` then flags as shown above.
