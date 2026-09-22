# ContextOS Container Deployment

## Purpose

This is the repository-owned production-style self-hosting path for ContextOS. It packages the application itself, PostgreSQL, committed migrations, and trusted operator account tooling with Docker Compose.

It does not turn ContextOS into an operated SaaS service and it does not replace target-specific TLS, backups, monitoring, firewall/WAF, or disaster-recovery decisions.

## Runtime Shape

`compose.production.yml` defines four services:

- `database`: PostgreSQL 16 with a persistent named volume;
- `migrate`: a one-shot non-root operator image that runs `prisma migrate deploy`;
- `app`: the non-root Next.js standalone runtime exposed on `CONTEXTOS_PORT`;
- `operator`: an unexposed profile for trusted account creation and password recovery.

The long-running `app` image does not contain the repository `scripts/` directory or Prisma migration tree. Administrative tooling stays in the separate operator image.

Production startup never runs `npm run db:seed`. Demo records are not part of the container deployment path.

## Prerequisites

- Docker Engine with Docker Compose v2;
- a host/reverse proxy capable of serving the configured public origin over HTTPS for a real deployment;
- secure values for the production environment file.

Node.js and npm are not required on the host for the container path.

## Configure

Copy the template:

```bash
cp .env.production.example .env.production
```

Replace every placeholder before deployment. At minimum configure:

- `POSTGRES_PASSWORD` with a strong URL-safe database password;
- `AUTH_SECRET` with a fresh high-entropy value of at least 32 characters;
- `APP_URL` with the exact public HTTPS origin;
- `CONTEXTOS_PORT` if port `3000` is not appropriate.

Keep these safe defaults unless you deliberately need otherwise:

```text
ALLOW_PUBLIC_REGISTRATION=false
ALLOW_DEMO_RESET=false
```

`APP_URL` is supplied as a build argument because browser-visible Next.js public configuration is compiled into the application. Rebuild the app image when the canonical public origin changes.

Do not commit `.env.production`.

## First Deployment

Build and start the application stack:

```bash
docker compose --env-file .env.production -f compose.production.yml up -d --build app
```

Compose waits for PostgreSQL health, runs committed migrations through the one-shot `migrate` service, and starts the application only after migrations complete successfully.

Inspect service state with:

```bash
docker compose --env-file .env.production -f compose.production.yml ps
```

Check application/database availability with:

```bash
curl --fail https://contextos.example.com/api/health
```

A healthy response reports both application and database availability. This endpoint is an availability check, not backup or end-user workflow evidence.

## Create The First Account

With public registration closed, create a real empty-workspace account through the unexposed operator service:

```bash
docker compose --env-file .env.production -f compose.production.yml --profile operator run --rm operator \
  npm run account:create -- user@example.com --generate-password
```

The generated temporary password is printed once. Store it securely and change it after sign-in.

To supply a chosen password without placing it in shell history or the process list:

```bash
read -rsp "New ContextOS password: " CONTEXTOS_PASSWORD
printf '\n'
printf '%s' "$CONTEXTOS_PASSWORD" | \
  docker compose --env-file .env.production -f compose.production.yml --profile operator run -T --rm operator \
  npm run account:create -- user@example.com --password-stdin
unset CONTEXTOS_PASSWORD
```

The create command refuses to overwrite an existing account and creates only the empty production workspace scaffold. It does not create demo Areas, Projects, Tasks, Dates, or Daily Notes.

## Password Recovery

A trusted deployment operator can reset an existing account password without enabling a public reset endpoint:

```bash
docker compose --env-file .env.production -f compose.production.yml --profile operator run --rm operator \
  npm run account:reset-password -- user@example.com --generate-password
```

The stdin form is also supported. Operator recovery preserves workspace rows and revokes every server session for the account. It cannot erase cached data from another offline device.

See `docs/OPERATOR_ACCOUNTS.md` for the complete trust boundary.

## Updates

For a normal application update:

1. review release notes and any new Prisma migrations;
2. verify the target database backup/recovery posture appropriate to the deployment;
3. update the checked-out ContextOS release;
4. rebuild and start the stack:

```bash
docker compose --env-file .env.production -f compose.production.yml up -d --build app
```

The migration service uses `prisma migrate deploy`; it does not create development migrations and it never seeds data.

Do not assume an older application can run against every future migrated schema. Review the exact release pair before relying on application rollback.

## Stop And Remove

Stop containers while preserving PostgreSQL data:

```bash
docker compose --env-file .env.production -f compose.production.yml down
```

Do **not** add `-v` unless you intentionally want Docker to remove the persistent PostgreSQL volume. Destroying the volume destroys the container-managed database.

## Security Boundary

The production container path deliberately keeps the following boundaries:

- the public app runs as a non-root user;
- the operator/migration image also runs as non-root;
- Linux capabilities are dropped for application/operator services and `no-new-privileges` is enabled;
- account/migration tooling is not copied into the long-running app image;
- the operator service publishes no port and is disabled behind a Compose profile during normal runtime;
- public registration and demo reset remain closed by default;
- application startup never performs demo seeding;
- secrets come from deployment environment values, not baked image defaults.

The repository still does not supply TLS termination, provider-native PITR, distributed WAF/rate limiting, external monitoring/on-call, penetration testing, or compliance certification. Those remain deployment responsibilities rather than properties a Dockerfile can magically confer.

## Repository Verification

CI runs:

```bash
npm run test:container-distribution
```

The smoke test uses an isolated Compose project and fresh PostgreSQL volume. It verifies that:

- production app/operator/migration images build;
- migrations complete before app startup;
- `/api/health` reports the fresh database healthy;
- the public app container is not running as root;
- the public app image does not contain operator scripts or the Prisma migration tree;
- production registration remains closed;
- a first account can be created through the operator container with password data on stdin;
- that account can authenticate through the containerized application;
- its bootstrap contains only the empty production scaffold rather than demo records; and
- representative synchronized workspace data and the operator-created account survive an app/database container restart while the named PostgreSQL volume is preserved.

The Batch 18 v1 release rehearsal therefore covers both fresh-volume acceptance and restart persistence using the repository-owned Compose path. A passing run emits `CONTEXTOS_CONTAINER_DISTRIBUTION=PASS` and `CONTEXTOS_CONTAINER_RESTART_PERSISTENCE=PASS`. This still does not constitute backup/PITR, RTO/RPO, or disaster-recovery evidence.

The test tears down its isolated containers and volume after completion.
