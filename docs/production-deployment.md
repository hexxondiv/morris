# Production Deployment Runbook

This runbook is for deploying the Next.js app to a Linux server with Node.js and MySQL.

## 1) Provision server and runtime

- Install Node.js 20+ and npm.
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

## 4) Apply schema and seed baseline data

```bash
npm run db:migrate
npm run db:seed
npm run db:bootstrap-super-admin
```

Run the migration import pipeline only if you are migrating legacy data (see `docs/runbook-production-migration.md`).

## 5) Start app process

Run under a supervisor and do not rely on an interactive shell.

### systemd unit (included)

Template file: `deploy/systemd/morris.service`

Install and enable:

```bash
sudo cp deploy/systemd/morris.service /etc/systemd/system/morris.service
sudo systemctl daemon-reload
sudo systemctl enable --now morris.service
sudo systemctl status morris.service
```

If your deploy user/path differs, update `User`, `Group`, `WorkingDirectory`, and `EnvironmentFile` in the unit file before copying.

### Apache site config (included)

Template file: `deploy/apache/morris.example.com.conf`

1. Replace `morris.example.com` and TLS cert paths with your real domain/cert files.
2. Enable Apache modules and site:

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo cp deploy/apache/morris.example.com.conf /etc/apache2/sites-available/morris.conf
sudo a2ensite morris.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

This config terminates TLS at Apache and reverse-proxies traffic to `127.0.0.1:3000`.

## 6) Post-deploy verification

- Open landing page and authenticated dashboard.
- Test Google sign-in flow end-to-end.
- Verify file upload writes under `public/uploads/` and URLs resolve.
- If payments enabled, run a live/test transaction and verify callback + webhook handling.
- Confirm app restarts cleanly and persists uploads across deployments.

## 7) Ongoing operations

- Backup MySQL and `public/uploads/` regularly.
- Keep `.env` out of version control and rotate secrets periodically.
- Deploy using `npm ci`, `npm run check:prod`, and `npm run db:migrate` before restart.
