# Environment Reference

Sanitized baseline for the **post–workstream 09** runtime: Auth.js, Prisma/MySQL, and S3-compatible storage. Legacy Clerk and Supabase **application** variables are removed; optional **operator-only** variables for the migration CLI are listed under “Offline migration”.

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

### S3-compatible object storage

- `STORAGE_PROVIDER` — `s3` (default) or `r2` (both use the S3 API).
- `S3_BUCKET`
- `S3_REGION` — use `auto` for Cloudflare R2 where appropriate. For MinIO, `us-east-1` is fine if the server does not enforce region.
- `S3_ENDPOINT` — required for R2/MinIO/custom endpoints; omit for default AWS regional endpoints.
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL` — prefix used when persisting object URLs (see `lib/storage/public-url.ts`): **no trailing slash**. For **MinIO with path-style** access, this is usually `https://<host>:<port>/<bucket>` so that `/{objectKey}` appended matches MinIO’s public object path (`/bucket/key`).
- `S3_FORCE_PATH_STYLE` — set to `true` for **MinIO** and many self-hosted S3-compatible servers.

#### MinIO (local or LAN)

1. Create a bucket (e.g. `morris`) in the MinIO console and, for public images used by the web app, attach a **read-only anonymous** policy on that bucket (or terminate TLS at a reverse proxy that serves objects under a stable HTTPS host).
2. Point `S3_ENDPOINT` at the **S3 API** listener (often port `9000`), not the console port (`9001`).
3. Example (adjust host, bucket, and credentials if you changed MinIO root user):

   - `S3_ENDPOINT=https://192.168.1.15:9000`
   - `S3_FORCE_PATH_STYLE=true`
   - `S3_BUCKET=morris`
   - `S3_PUBLIC_BASE_URL=https://192.168.1.15:9000/morris`

4. If the MinIO API uses a **self-signed** certificate, Node may reject TLS until the cert is trusted system-wide or you terminate TLS on a trusted reverse proxy. Avoid disabling TLS verification in production.

`next.config.js` adds a `next/image` **remotePatterns** entry from `S3_PUBLIC_BASE_URL` at build time, so restart the dev server after changing storage env vars.

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

## Notes

- `NEXT_PUBLIC_SITE_URL` is not required; the app uses `NEXT_PUBLIC_BASE_URL` where a public origin is needed.
- `supabase/config.toml` (if present) refers to Supabase CLI local tooling only, not the deployed app env contract.
