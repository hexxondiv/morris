# Workstream 05: Data Access Layer and Read Migration

## Prompt

You are working on the `MORRIS MONYE` codebase. Replace direct `Supabase` read access with a first-party data access layer built on the new ORM and schema.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

Use the migration map to define file scope and `00-index.md` to coordinate work with `03`, `04`, `06`, and `07`.

## Objective

Stop application read paths from importing or depending on `Supabase`.

## Scope

1. Create internal database access modules or repositories.
2. Replace `supabaseAdmin`, `supabase`, and direct RPC-backed reads in high-value read paths.
3. Migrate read logic for:
   - settings
   - projects
   - public project detail
   - public ledger
   - marquee data
   - users
   - cases
   - voting views

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This workstream depends on `02`.
- It can run in parallel with parts of `03` and `07`, but overlapping files require coordination.
- `06` depends on the repository and query patterns established here.

### File Ownership from `file-by-file-migration-map.md`

Primary ownership includes mapped files tagged with `05`, especially:

- `lib/supabase.ts`
- data-access portions of `lib/supabase-admin.ts`
- `app/api/projects/route.ts`
- `app/api/projects/[slug]/route.ts`
- `app/api/open-ledger-metrics/route.ts`
- `app/api/marquee-data/route.ts`
- `app/api/users/route.ts`
- `app/api/cases/route.ts`
- `app/api/states/route.ts`
- `app/api/states/[state_id]/lgas/route.ts`
- read-side `app/api/transactions/*`
- `app/api/pledges/export/route.ts`
- `lib/actions/*` files tagged with `05`
- `hooks/use-public-ledger.ts`

## Execution Protocol

1. Build repositories and query services before mass route conversion.
2. Remove direct Supabase reads from any file marked as converted.
3. Preserve response contracts where practical.
4. Document unresolved RPC-equivalent logic explicitly.
5. In shared files, keep to read-path ownership unless another workstream boundary is agreed.

## Requirements

1. Move all read logic behind internal modules.
2. Replace vendor-specific query syntax with ORM or SQL under internal ownership.
3. Preserve current response shapes where practical to reduce UI churn.
4. Document any current Supabase RPC that must be reimplemented.

## Deliverables

1. Repository or query modules
2. Converted read-side API routes and actions
3. Removal of Supabase read dependencies from converted files
4. A short mapping of former RPC calls to new implementations

## Constraints

1. Do not half-migrate a file and leave mixed data sources unless there is a clear temporary boundary.
2. Prefer service modules over embedding ORM queries everywhere.
3. Be explicit where current behavior cannot be replicated exactly yet.

## Success Criteria

1. Converted read paths no longer depend on Supabase.
2. Responses remain functionally compatible with the current UI.
3. The new data layer is reusable for write-path migration.

## Completion Checklist

1. Primary read files from the migration map are handled or explicitly deferred.
2. Repository boundaries are stable enough for `06`.
3. RPC replacement gaps are documented.
4. Shared ownership with `04` and `06` is respected.

## Expected Output

Provide:

1. The modules added for data access
2. The endpoints and actions converted
3. Any unresolved RPC-equivalent logic still pending

---

## Completion notes (RPC and read-model gaps)

The following legacy Supabase RPCs are **not** reproduced 1:1 in Prisma; first-party aggregates or settings-backed values approximate them. Tune after data migration verification (workstream `08`).

| Legacy RPC | Replacement in this workstream | Gap / follow-up |
| --- | --- | --- |
| `get_open_ledger_metrics` | `ledger-metrics-repository` aggregates + `settings` keys (`manual_*`, `default_currency`, `metrics_data_source`) | Totals and fund splits can diverge from the old SQL until manual keys are aligned or a dedicated summary table is introduced (see `target-schema-overview.md`). |
| `get_marquee_data` | `getMarqueePayload()` — prefers JSON setting `marquee_featured_items`, else featured `projects` | Does not replicate every dynamic metric tile the old RPC may have returned; extend shaping if the UI requires more metric rows. |
| `get_public_ledger` | `public-ledger-repository` + `GET /api/public-ledger` | `running_balance` is computed only over the returned window (not full ledger history). Top-donor date fields are approximate. Realtime updates were replaced with polling in `hooks/use-public-ledger.ts`. |
| `get_transactions` / `fetch_transaction` | `transaction-repository` Prisma queries | Filter semantics and joined columns follow the new schema (`TransactionKind`, `TransactionStatus`, `ledger_accounts`); validate against migrated data. |
| `get_pledges` (export path only here) | `pledge-repository` | Full pledge listing route (`app/api/pledges/route.ts`) remains on Supabase until workstream `06`. |
