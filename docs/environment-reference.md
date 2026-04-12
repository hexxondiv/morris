# Environment Reference

Sanitized baseline for the **post–workstream 09** runtime: Auth.js, Prisma/MySQL, and on-disk uploads under `public/uploads/`. Legacy Clerk and Supabase **application** variables are removed; optional **operator-only** variables for the migration CLI are listed under “Offline migration”.

## Application (required for normal operation)

### App origin

- `NEXT_PUBLIC_BASE_URL` — canonical site origin for metadata, client `fetch` to same host, SwitchApp callbacks, and `next/image` remote patterns where applicable.

### Auth.js and Google

- `AUTH_SECRET`
- `AUTH_URL` — must match the deployed origin (used for OAuth callbacks).
- `AUTH_TRUST_HOST` — set to `true` behind some reverse proxies if Auth.js requires it.
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Google redirect URI: `${AUTH_URL}/api/auth/callback/google`

### Bootstrap super admin (first deploy)

- `BOOTSTRAP_SUPER_ADMIN_EMAIL`
- `BOOTSTRAP_SUPER_ADMIN_NAME`

Used by `prisma/seed.ts` / `npm run db:bootstrap-super-admin` so at least one `super_admin` exists in a controlled way.

### MySQL

- `DATABASE_URL` — MySQL connection string for Prisma.

### File uploads

Upload APIs write under `public/uploads/` and return same-origin paths such as `/uploads/images/...`. No storage-related environment variables are required. Ensure the deploy user can write to `public/uploads/` and that you back up or sync that directory if you rely on uploaded files in production.

### Payments (SwitchApp)

- `NEXT_PUBLIC_SW_PUBLIC_KEY` — client-side checkout integration.

## Offline migration CLI (operators only)

Not used by the Next.js app at runtime. Set when running `npm run migration:export`:

- `NEXT_PUBLIC_SUPABASE_URL` or `LEGACY_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `LEGACY_SUPABASE_SERVICE_ROLE_KEY`

These allow **read-only** REST export from a legacy Supabase project into JSON artifacts, as described in `docs/runbook-production-migration.md`.

## Removed from application runtime

The following are **no longer** read by production code:

- Clerk: `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`
- Supabase JS client: `NEXT_PUBLIC_SUPABASE_ANON_KEY` and app use of `SUPABASE_SERVICE_ROLE_KEY`
- Object storage: `STORAGE_PROVIDER`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL`, `S3_FORCE_PATH_STYLE` (uploads use `public/uploads/` instead)

## Notes

- `NEXT_PUBLIC_SITE_URL` is not required; the app uses `NEXT_PUBLIC_BASE_URL` where a public origin is needed.
- `supabase/config.toml` (if present) refers to Supabase CLI local tooling only, not the deployed app env contract.
