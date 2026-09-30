# NynetyDegrees Artist Portal

Self-hosted release management for the NynetyDegrees label. The application is a TypeScript modular monolith built with Next.js 16, React 19, PostgreSQL, Prisma 7, Better Auth, and a local private file store. Docker Compose runs the application, PostgreSQL, and Caddy on one Windows PC through Docker Desktop / WSL2; the same containers can run on a VPS.

## What works

- Email/password registration and sign-in with Argon2id password hashes and HTTP-only session cookies.
- Server-side `USER`, `MANAGER`, and `ADMIN` permission checks.
- Release drafts, artist and featured artist credits, track lists, ISRCs, songwriter / lyrics / producer credits, genre, language, explicit flag, and requested date.
- Private artwork and WAV/FLAC uploads with size, MIME, extension, and file-signature validation, plus authenticated audio playback and download.
- Release comments, moderation actions, strict status transitions, status history, and audit records.
- Admin client roles and audit log. Caddy is ready for a public HTTPS domain; CrowdSec and nftables deployment hooks are under `ops/`.

The first delivery is an operational MVP. Email verification, password reset mail, per-track featuring credits, and distributed rate-limit storage are not configured. Better Auth protects auth endpoints; other API routes use a bounded in-process limiter, appropriate for the single application instance in this Compose setup.

## Requirements

- Windows 11 with WSL2 and Docker Desktop using the WSL2 engine, or Linux with Docker Engine and the Compose v2 plugin.
- Git.
- Node.js 24 only for running commands directly on the host. The container image already uses Node 24.
- Ports 80 and 443 available for Caddy. PostgreSQL is published only to `127.0.0.1:5432` in the local Compose setup.

## Test with a GitHub Codespaces URL

The repository includes a dedicated Codespaces dev container. It runs Next.js in development mode with an isolated PostgreSQL database and sample accounts; it does not use production services or data.

1. Push this repository to GitHub and open it in Codespaces.
2. Wait for dependencies to install and the `3000` port to appear in the **Ports** panel.
3. Open the forwarded port URL. Port visibility is private by default and requires your GitHub session.

Sample accounts are seeded automatically in Codespaces:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.local` | `Nynety-Local-2026!` |
| Manager | `manager@example.local` | `Nynety-Local-2026!` |
| User | `user@example.local` | `Nynety-Local-2026!` |

Use only test data in this environment. If you intentionally make the port public, anyone with the URL can reach the test sign-in page and sample accounts. Codespaces stops after inactivity and is for previews, not continuous hosting.

To inspect startup output, run `tail -f /tmp/nynety-codespaces.log` in the Codespaces terminal. The app listens on port 3000; Codespaces provides the HTTPS URL and `BETTER_AUTH_URL` is set to that host at startup.

## Start locally

From the repository root, in WSL or PowerShell with Docker Desktop running:

```sh
cp .env.example .env
```

Replace `BETTER_AUTH_SECRET` with a fresh random value of at least 32 characters. A PowerShell option is:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Then start the full local stack:

```sh
docker compose up --build
```

Open [http://localhost](http://localhost). On the first start, the app waits for PostgreSQL, applies Prisma migrations, inserts development accounts and sample releases, then starts the web server. Uploaded files and the database persist in Docker volumes.

### Development accounts

These credentials are for local development only. Change passwords before sharing the machine or publishing any deployment.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.local` | `Nynety-Local-2026!` |
| Manager | `manager@example.local` | `Nynety-Local-2026!` |
| User | `user@example.local` | `Nynety-Local-2026!` |

## Stop, migrate, and seed

Stop containers but keep data:

```sh
docker compose down
```

Apply newly committed migrations to a running database:

```sh
docker compose exec app npx prisma migrate deploy
```

Run the local development seed again:

```sh
docker compose exec -e NODE_ENV=development app npm run db:seed
```

The seed is disabled in production. To clear the **local development** database and uploaded files, stop Compose and remove its volumes:

```sh
docker compose down -v
```

That command permanently removes the Compose database and file-store volumes. Do not use it against production data.

## Run on the host

For local development without the app container, start only PostgreSQL and use Node 24:

```sh
docker compose up -d postgres
npm ci
npm run db:generate
npm run db:migrate -- --name initial
npm run db:seed
npm run dev
```

Host development is served by Next.js on `http://localhost:3000`. Set `DATABASE_URL` to the host-published PostgreSQL URL in `.env`. Prisma migrations are checked into `prisma/migrations`; use `npm run db:migrate -- --name <change>` when developing schema changes.

## Checks

```sh
npm run typecheck
npm run lint
npm test
```

The end-to-end suite expects the Compose app and seeded development accounts to be running:

```sh
npm run test:e2e
```

Set `APP_URL` if the portal uses a different URL. Playwright’s Chromium browser must be installed for the account and release workflow tests.

## Create the first production admin

Start the production Compose stack, then create an admin using a one-time shell environment. If the email already belongs to a user, the script promotes that account; otherwise it creates a new one. The password is Argon2id-hashed and is never printed.

```sh
export ADMIN_EMAIL=admin@your-domain.example
export ADMIN_NAME="Label Admin"
read -rsp "Admin password: " ADMIN_PASSWORD; export ADMIN_PASSWORD; echo
docker compose -f docker-compose.yml -f docker-compose.production.yml exec -e ADMIN_EMAIL -e ADMIN_NAME -e ADMIN_PASSWORD app npm run admin:create
unset ADMIN_PASSWORD
```

On PowerShell, set the three environment variables for the command and remove them afterward. Do not put a production admin password in `.env`, shell history, or source control.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Compose replaces this with the internal service URL. |
| `BETTER_AUTH_SECRET` | Session/auth secret; keep private and use a random value of at least 32 characters. |
| `BETTER_AUTH_URL` | Canonical public URL used by Better Auth. |
| `APP_URL` | Portal URL; `http://localhost` locally and `https://<domain>` on a VPS. |
| `APP_DOMAIN` | Caddy site name in the production Compose override. |
| `STORAGE_PATH` | Local storage root; defaults to `./storage/releases`. |
| `MAX_AUDIO_FILE_SIZE_MB` | Maximum size for WAV and FLAC uploads; default 250 MB. |
| `MAX_ARTWORK_FILE_SIZE_MB` | Maximum size for JPG/JPEG/PNG uploads; default 20 MB. |
| `LOG_LEVEL` | Pino level, such as `info`, `warn`, or `error`. |
| `POSTGRES_PASSWORD` | Local Compose PostgreSQL password; replace before production. |
| `HTTP_PORT`, `HTTPS_PORT`, `POSTGRES_PORT` | Host-side port mapping overrides. |

## Architecture

```text
Browser
  └─ Caddy (HTTP locally / automatic HTTPS on the VPS)
       └─ Next.js App Router
            ├─ Better Auth + Argon2id
            ├─ Route Handlers → Zod → permission checks → domain services
            ├─ Prisma 7 PostgreSQL adapter → PostgreSQL
            └─ StorageProvider → LocalStorageProvider → private Docker volume
```

The `server/` folder separates auth, permissions, validation, storage, persistence, and release workflow. Files are stored under opaque UUID names outside `public/`; the database stores metadata only. Every download goes through an authenticated release-scoped route. Release status writes are checked against `server/services/release-workflow.ts` and recorded with actor and timestamp.

## Storage and moving to S3

`StorageProvider` in `server/storage/provider.ts` exposes `put`, `get`, and `delete`; the app selects `LocalStorageProvider` in `server/storage/index.ts`. Business routes store opaque keys and never receive filesystem paths. To add S3 later, implement the same interface and change the provider selection/configuration. Keep release authorization and MIME/signature validation in the route layer; store S3 objects private and stream reads through authorized handlers or short-lived signed URLs.

## Production deployment on a Beget VPS

1. Use an Ubuntu VPS, point the domain's A record to its public IPv4, and allow only SSH plus ports 80/443 in the host firewall.
2. Install Docker Engine and the Compose v2 plugin. Copy `.env.example` to `.env`; set `APP_DOMAIN`, a URL-safe strong `POSTGRES_PASSWORD`, and a fresh `BETTER_AUTH_SECRET` of at least 32 characters. Set `APP_URL` and `BETTER_AUTH_URL` to `https://<your-domain>` if running the base Compose file locally; the production overlay derives both from `APP_DOMAIN`.
3. Build and start with `docker compose -f docker-compose.yml -f docker-compose.production.yml up --build -d`.
4. Caddy obtains and renews TLS certificates and proxies to the internal app service. PostgreSQL is not published on a host port.
5. Create the first admin with `prisma/create-admin.mjs`. The production image does not load sample users or releases.
6. Back up PostgreSQL and the `release_storage` volume together; test a restore before relying on the service.

For a 2-vCPU VPS with limited RAM, build the image on GitHub Actions or another build machine and transfer the finished image to Beget instead of compiling Next.js on the VPS. Keep uploads and PostgreSQL backups outside the VM as the catalog grows.

The production overlay removes PostgreSQL’s host port and uses the HTTPS Caddyfile. The example nftables rules are in `ops/nftables.conf.example`; review SSH access and existing host firewall rules before adapting them. Caddy writes JSON request logs to `caddy_logs` for a future CrowdSec agent. The standard Caddy image does not include a CrowdSec blocking bouncer; see `ops/crowdsec.md` before enabling enforcement.

## File layout

```text
app/                     Next.js pages and Route Handlers
components/              Shared UI components
server/auth/             Better Auth and role parsing
server/db/               Prisma client
server/permissions/      RBAC helpers
server/services/         Release state machine
server/storage/          StorageProvider and local implementation
server/validation/       Zod request schemas
prisma/schema.prisma     PostgreSQL models and enums
prisma/migrations/       Checked-in schema migrations
tests/unit/              Permission, workflow, validation, and storage tests
tests/e2e/               Playwright release moderation journey
storage/releases/        Host development files (Docker uses a named volume)
```
