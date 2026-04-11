# Workstream 07: Storage and File Migration

## Prompt

You are working on the `MORRIS MONYE` codebase. Replace `Supabase Storage` usage with a first-party storage abstraction backed by `S3` or `Cloudflare R2`.

## Required Planning Inputs

Before doing any work, read:

1. [File-by-File Migration Map](/var/www/html/morris/docs/file-by-file-migration-map.md)
2. [Transition Workstreams Index](/var/www/html/morris/docs/transition_workstreams/00-index.md)

Use the migration map to identify every upload and file URL surface.

## Objective

Move uploads and asset URL generation away from Supabase Storage.

## Scope

1. Introduce an internal storage adapter.
2. Replace storage usage in:
   - project image uploads
   - case file uploads
   - avatar uploads
3. Update file metadata persistence to match the new storage layer.
4. Ensure public URL generation works consistently.

## Relationship to Planning Artifacts

### Dependency Position from `00-index.md`

- This workstream begins after `02` is stable.
- It can run in parallel with `05` and later with `06`, but overlapping upload and metadata files require coordination.
- `08` depends on this workstream to define legacy asset handling.

### File Ownership from `file-by-file-migration-map.md`

Primary ownership:

- `app/api/upload-image/route.ts`
- `app/api/cases/upload/route.ts`
- `app/api/users/[id]/upload-avatar/route.ts`
- storage-related portions of `components/components/project-form.tsx`

Secondary coordination:

- any mapped file where stored file URLs are generated or persisted
- `components/components/team-carousel.tsx` if hardcoded storage URLs are normalized

## Execution Protocol

1. Introduce a storage abstraction before changing routes.
2. Keep provider-specific details isolated to storage modules.
3. Update metadata persistence and URL generation together where coupled.
4. Document legacy asset migration requirements if existing objects must remain available.
5. Coordinate with `06` where upload metadata participates in transactional writes.

## Requirements

1. Support secure server-side uploads.
2. Preserve existing file metadata fields where still useful.
3. Handle content types, paths, and object naming predictably.
4. Keep storage operations behind internal abstractions.

## Deliverables

1. Storage client module
2. Converted upload routes
3. Updated file URL logic
4. Documentation for required storage environment variables

## Constraints

1. Do not hardcode provider-specific URLs in business logic.
2. Avoid leaking provider details into UI code.
3. If migration of existing assets is not performed here, document the migration strategy clearly.

## Success Criteria

1. Converted upload flows no longer depend on Supabase Storage.
2. Public assets resolve correctly through the new storage model.
3. The storage layer can be swapped or extended without touching business logic.

## Legacy assets and URLs (workstream `07` outcome)

1. **Existing Supabase Storage objects** were not bulk-copied in this pass. Rows and UI that still point at `*.supabase.co/storage/v1/object/public/...` URLs keep working as long as the legacy Supabase project and bucket remain available. Workstream `08` should plan a content migration (re-upload or proxy) and URL rewrite for any records that must survive Supabase teardown.
2. **New uploads** write under predictable keys in the configured bucket (see `lib/storage/object-keys.ts`): `images/project-covers/*`, `images/cases/*`, `images/avatars/{userId}/*`, and `images/misc/*` when no safe folder prefix is supplied.
3. **Team carousel** no longer hardcodes Supabase URLs; placeholder SVGs live under `public/images/team/`. Production portraits can later be served from the same object storage/CDN via env-driven configuration in workstream `08` or `09` if desired.
4. **Case intake vs storage** is intentionally two-step: `/api/cases/upload` then `/api/cases/create`. If create fails after upload, objects may be orphaned until cleanup or migration tooling addresses them.

## Completion Checklist

1. Upload files in the migration map are handled or explicitly deferred.
2. Provider-specific URL construction is removed from business logic.
3. Asset migration strategy is documented for `08`.

## Expected Output

Provide:

1. The storage adapter shape
2. The upload routes converted
3. Any asset migration work still pending
