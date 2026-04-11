# Workstream 09: Cutover, Cleanup, and Dependency Removal

## Prompt

You are working on the `MORRIS MONYE` codebase. Complete the final cutover from `Clerk` and `Supabase` to the in-house stack, remove legacy dependencies, and leave the repository in a stable post-migration state.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

This workstream is governed most strictly by the cutover readiness rules in `00-index.md`.

## Objective

Finalize the transition and eliminate legacy runtime coupling.

## Scope

1. Remove `Clerk` packages, config, and dead code.
2. Remove `Supabase` packages, config, and dead code.
3. Remove compatibility shims introduced during transition once no longer needed.
4. Update app startup, middleware, auth flows, and deployment configuration.
5. Update repository documentation to reflect the new stack.

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This is the final workstream.
- It depends on `03`, `04`, `05`, `06`, `07`, and `08`.
- Do not begin cleanup until the readiness criteria in `00-index.md` are satisfied.

### File Ownership from `file-by-file-migration-map.md`

Primary ownership:

- all files listed under legacy cleanup candidates
- any remaining file still importing `Clerk`
- any remaining file still importing `Supabase`

This workstream also owns the final status update of the migration map for completed removals.

## Execution Protocol

1. Verify readiness before deleting legacy code.
2. Remove imports only after replacement call sites are confirmed live.
3. Delete compatibility shims only when no mapped file depends on them.
4. Update docs and manifests in the same change set as dependency removal.
5. Re-scan the repository for legacy imports before considering the work complete.

## Requirements

1. Ensure the app builds and runs on the new stack only.
2. Ensure all migrated flows use internal auth, ORM-backed data access, and internal storage abstractions.
3. Remove legacy vendor env vars when safe.
4. Update package manifests and lockfiles.
5. Verify the application still works end to end after all Clerk and Supabase dependencies are removed.

## Deliverables

1. Legacy dependency removal
2. Cleanup of dead files and imports
3. Updated README or docs
4. Final migration completion notes

## Constraints

1. Do not remove transitional code until all call sites are migrated.
2. Verify there are no residual imports from legacy SDKs.
3. Leave the codebase in a coherent and maintainable state.

## Success Criteria

1. No production code depends on Clerk or Supabase.
2. The repository documents the new architecture accurately.
3. The app builds cleanly with the new dependency set.
4. The application works correctly and smoothly after all Clerk and Supabase dependencies are removed.

## Completion Checklist

1. Legacy packages are removed from manifests and lockfiles.
2. Migration map statuses are updated for removed or completed files.
3. No legacy imports remain in production code.
4. At least one valid `super admin` exists after final cutover.
5. Documentation reflects the final post-migration architecture.

## Expected Output

Provide:

1. The dependencies removed
2. The legacy files deleted or replaced
3. Any final follow-up items still outside the cutover scope
