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

## Completion Checklist

1. Upload files in the migration map are handled or explicitly deferred.
2. Provider-specific URL construction is removed from business logic.
3. Asset migration strategy is documented for `08`.

## Expected Output

Provide:

1. The storage adapter shape
2. The upload routes converted
3. Any asset migration work still pending
