## MORRIS MONYE

Community-driven project funding platform for South-East Nigeria.

### Stack

- **Framework:** Next.js (App Router)
- **Auth:** [Auth.js](https://authjs.dev/) (NextAuth) with **Google** OAuth, database sessions, and role claims hydrated from MySQL (`User` / `UserRole`)
- **Database:** **MySQL** with **Prisma** (schema + migrations under `prisma/`)
- **File storage:** S3-compatible API via `@aws-sdk/client-s3` (`lib/storage`), configured with `STORAGE_PROVIDER`, `S3_*`, and `S3_PUBLIC_BASE_URL`
- **Payments:** SwitchApp client SDK where referenced by checkout flows

### Local development

1. Copy `.env.example` to `.env` and set variables (see `docs/environment-reference.md`).
2. `npm install`
3. `npx prisma migrate deploy` (or `db:migrate`) and `npm run db:seed`
4. `npm run dev`

### Data migration (legacy → Prisma)

One-time export / transform / import / verify is documented in `docs/runbook-production-migration.md` and driven by:

- `npm run migration:export`
- `npm run migration:transform`
- `npm run migration:import`
- `npm run migration:verify`
- `npm run migration:rewrite-urls` (optional URL rewrites)

Export reads legacy Supabase **PostgREST** using the service role key (no `@supabase/supabase-js` at runtime).

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed roles and reference data |
| `npm run db:bootstrap-super-admin` | Ensure bootstrap super admin (see env + `prisma/seed.ts`) |

### Documentation

- `docs/environment-reference.md` — environment variables
- `docs/file-by-file-migration-map.md` — Clerk/Supabase → internal stack map (historical + status)
- `docs/clerk-supabase-migration-plan.md` — migration plan
- `docs/runbook-production-migration.md` — production migration procedure
