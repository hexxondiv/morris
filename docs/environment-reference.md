# Environment Reference

This document records the sanitized environment baseline established by workstream `01-security-environment-hardening`.

## Scope

The `.env.example` file now contains only:

1. legacy variables still required by the current runtime
2. transition variables needed for the approved migration path
3. target-stack variables for `MySQL`, `Auth.js`, direct `Google` sign-in, and `S3` or `Cloudflare R2`

## Current Legacy Variables Still Required

These remain because the current checked-in app still references them directly.

### App Origin

- `NEXT_PUBLIC_BASE_URL`

Used by:

- `app/layout.tsx`
- `app/(public)/layout.tsx`
- `app/(public)/projects/[slug]/page.tsx`
- `app/(dashboard)/admin/projects/edit/[slug]/page.tsx`
- `lib/switchapp.ts`

### Clerk

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`

Why kept:

- current auth remains Clerk-backed for some UI surfaces until workstreams `03` and `09`
- the user webhook route still depends on Clerk webhook verification
- routing compatibility should not change before workstreams `03`, `04`, and `09`

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Why kept:

- current read and write paths still create Supabase clients in `lib/supabase.ts`, `lib/supabase-provider.tsx`, and `lib/supabase-admin.ts` for deferred surfaces (for example parts of `project-form.tsx`)
- API routes no longer use Supabase Storage; uploads use `lib/storage` instead

### Legacy Payment Provider

- `NEXT_PUBLIC_SW_PUBLIC_KEY`

Why kept:

- the current client checkout flow in `lib/switchapp.ts` still uses it

## Transition Variables

- `BOOTSTRAP_SUPER_ADMIN_EMAIL`
- `BOOTSTRAP_SUPER_ADMIN_NAME`

Why introduced:

- the migration plan requires a deterministic first bootstrap `super admin`
- these do not affect the current runtime, but they are justified for workstreams `02` and `03`

## Target-Stack Variables

### Auth.js and Google

- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

Google OAuth callback for this workstream:

- `${AUTH_URL}/api/auth/callback/google`

Operational note:

- `AUTH_URL` should match the deployed application origin exactly so Google redirects and Auth.js callback URLs stay aligned.

### MySQL

- `DATABASE_URL`

### S3 or Cloudflare R2

- `STORAGE_PROVIDER` — `s3` (default) or `r2`; both use the same S3-compatible client (`S3_ENDPOINT` distinguishes R2).
- `S3_BUCKET`
- `S3_REGION` — use `auto` for Cloudflare R2 when using the R2 S3 API.
- `S3_ENDPOINT` — required for R2 and custom/MinIO endpoints; omit for default AWS regional endpoints.
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL` — public origin for `next/image` and for persisted `https?://` URLs (CDN or bucket website), no trailing slash.
- `S3_FORCE_PATH_STYLE` — optional; set to `true` for some S3-compatible servers that require path-style addressing.

Why introduced:

- they match the approved transition target and avoid adding speculative non-approved providers
- workstream `07` upload routes (`/api/upload-image`, `/api/cases/upload`, `/api/users/[id]/upload-avatar`) call `lib/storage` and require these variables at runtime when those features are used

## Removed Variable Categories

The following categories were removed from `.env.example` because they were stale, duplicate, misleading, unused by the current code, or not justified by the approved target stack.

### Real Secrets and Live-Looking Credentials

Removed all checked-in sample values that looked like live or test credentials for:

- Clerk
- Supabase
- SwitchApp
- production domain configuration

All remaining values are placeholders only.

### Unused Legacy Payment Secret Placeholder

Removed:

- `SW_SECRET_KEY`

Reason:

- it is not referenced by the current checked-in application code
- keeping it in `.env.example` would imply a server-side dependency that does not currently exist

## Residual Risks After This Workstream

These were found during audit and are intentionally documented rather than changed in this workstream.

### Hardcoded Vendor URLs

- Resolved for workstream `07`: team carousel portraits now use same-origin assets under `public/images/team/`, and avatar uploads use `lib/storage` plus `requireAuth` instead of the Clerk profile image API.

Impact:

- remaining hardcoded third-party image URLs should be tracked only if new ones are introduced outside env-driven storage

### SwitchApp Webhook Trust Model

- [app/api/webhooks/switchapp/route.ts](/var/www/html/morris/app/api/webhooks/switchapp/route.ts:1) processes webhook payloads without verifying a provider signature secret

Impact:

- this is a security risk in the current codebase
- no env variable was retained for this because the code does not currently consume one
- remediation should happen in the payment hardening or write-path workstream

## Notes

- `NEXT_PUBLIC_SITE_URL` is not included in `.env.example` because the app already falls back to `NEXT_PUBLIC_BASE_URL`
- `supabase/config.toml` references extra local Supabase CLI environment names, but those are not part of the current app runtime contract and were intentionally excluded from `.env.example`
