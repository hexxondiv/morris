# Production Deployment Runbook

This runbook is for deploying the Next.js app to production with MySQL.

## Recommended deployment mode for older servers

If your server cannot run modern Node.js due to older `glibc`, use Docker image deployment:

1. Build and push image from a local machine.
2. Pull and run the prebuilt image on the server.
3. Keep Apache as reverse proxy to `127.0.0.1:3000`.

## 1) Provision server and runtime

- Install Docker Engine and Docker Compose plugin on the server.
- Install and provision MySQL, then create a dedicated database/user for this app.
- Ensure the deploy user has write access to `public/uploads/`.
- Open only required ports (typically `80`/`443` from the internet, app port only from localhost/reverse proxy).

## 2) Prepare environment

1. Copy `.env.production.example` to `.env`.
2. Set production values:
   - `NEXT_PUBLIC_BASE_URL`, `AUTH_URL` -> your production HTTPS origin.
   - `AUTH_SECRET` -> long random secret.
   - Google OAuth credentials (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).
   - `DATABASE_URL` -> production MySQL connection string.
   - SwitchApp keys (`NEXT_PUBLIC_SW_PUBLIC_KEY`, `SWITCHAPP_SECRET_KEY`) if payments are enabled.
3. In Google OAuth console, add redirect URI:
   - `${AUTH_URL}/api/auth/callback/google`

## 3) Install and validate build

```bash
npm ci
npm run check:prod
```

`check:prod` runs a production build in a non-interactive way that is safe for CI/servers.

## 4) Build image locally and push

```bash
docker build -t your-docker-user/morris:2026-04-13-01 .
docker push your-docker-user/morris:2026-04-13-01
```

Use immutable tags (`YYYY-MM-DD-NN`) to make rollback easy.

## 5) Deploy image on server

1. Copy `docker-compose.yml` to the server repo path.
2. Update image tag in `docker-compose.yml`.
3. Pull and start:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Run schema/seed commands from the running image:

```bash
docker compose run --rm app npm run db:migrate
docker compose run --rm app npm run db:seed
docker compose run --rm app npm run db:bootstrap-super-admin
```

Run the migration import pipeline only if you are migrating legacy data (see `docs/runbook-production-migration.md`).

### Apache site config (included)

Template file: `deploy/apache/morris.example.com.conf`

1. Template is pre-filled for `morrismonye.com` and `www.morrismonye.com`. Update only if your production domain differs.
2. Enable Apache modules and site:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo cp deploy/apache/morris.example.com.conf /etc/apache2/sites-available/morris.conf
sudo a2ensite morris.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

This config terminates TLS at Apache and reverse-proxies traffic to `127.0.0.1:3000`.

## 6) Rollback

1. Set previous image tag in `docker-compose.yml`.
2. Run:

```bash
docker compose pull
docker compose up -d
```

## 7) Post-deploy verification

- Open landing page and authenticated dashboard.
- Test Google sign-in flow end-to-end.
- Verify file upload writes under `public/uploads/` and URLs resolve.
- If payments enabled, run a live/test transaction and verify callback + webhook handling.
- Confirm container restarts cleanly and persists uploads across deployments.

## 8) Ongoing operations

- Keep immutable image tags for each deploy and rollback point.
- Backup MySQL and `public/uploads/` regularly.
- Keep `.env` out of version control and rotate secrets periodically.
- Deploy by updating the image tag, then `docker compose pull && docker compose up -d`.
