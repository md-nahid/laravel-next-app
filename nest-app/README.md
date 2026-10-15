# NestJS API

This is the standalone NestJS backend used by the Next.js frontend in
`../next-app`. It runs against its own PostgreSQL database and does not require
or import Laravel application data.

## Stack

- NestJS 11 and TypeScript
- PostgreSQL, using Drizzle ORM and `drizzle-kit`
- Bun for package installation, scripts, and the lockfile
- Node.js 22 LTS for the NestJS runtime and tool compatibility

## Prerequisites

- [Bun](https://bun.sh/) (the repository currently uses Bun 1.3.14)
- Node.js 22 LTS
- Docker Desktop/Engine and Compose

## First-time setup

From this directory (`nest-app/`):

```bash
bun install
cp .env.example .env
```

Check `DATABASE_URL` in `.env` before starting the application. The example
configures NestJS to use its own PostgreSQL database, separate from Laravel.
The sample password is for local development only. Change it for any shared or
deployed environment, keep `.env` private, and never commit credentials.

Start NestJS's dedicated PostgreSQL container from `nest-app/`:

```bash
docker compose up -d nest-app
docker compose ps
```

This starts PostgreSQL 17 on host port `5433`, with a persistent Compose volume
named `nest-app_nest-postgres-data`. Laravel continues using its own PostgreSQL
container and port `5432`. The NestJS `.env` connection URL uses
`localhost:5433`; if you change `POSTGRES_HOST_PORT`, update `DATABASE_URL` to
match.

After PostgreSQL is healthy, apply the initial schema to the **new NestJS
database**:

```bash
bun run db:migrate
```

Then start the NestJS API:

```bash
bun run start:dev
```

The API listens on `http://localhost:3001` by default. Set `PORT` in `.env` to
change it. Configuration is validated at startup, and NestJS checks the
PostgreSQL connection with a read-only `SELECT 1`.

## Ported API routes

The following REST endpoints are implemented in NestJS. They use only the
isolated Nest database; this does not migrate Laravel users, sessions, tokens,
or messages.

| Method | Route | Authentication | Behavior |
| --- | --- | --- | --- |
| `GET` | `/csrf-cookie` | None | Issues the session and `XSRF-TOKEN` cookies. |
| `POST` | `/register` | CSRF cookie/header | Registers an account and starts a session. |
| `POST` | `/login` | CSRF cookie/header | Verifies credentials and starts a session. |
| `POST` | `/logout` | Session + CSRF | Invalidates the current session and clears its cookies. |
| `POST` | `/api/tokens` | None | Issues a Sanctum-compatible bearer token for API testing. |
| `GET` | `/api/user` | Session or bearer token | Returns the authenticated user. |
| `GET` | `/api/users` | Session or bearer token | Lists other users; supports `search`, `per_page`, and `pagination=false`. |
| `GET` | `/api/users/:id` | Session or bearer token | Returns user details and directional block state. |
| `POST` / `DELETE` | `/api/blocks/:userId` | Session or bearer token | Blocks or unblocks a user. |
| `GET` / `DELETE` | `/api/conversations/:partnerId` | Session or bearer token | Reads paginated history or hides the caller's history through its current latest message. |
| `POST` | `/api/conversations/:receiverId` | Session or bearer token | Sends a message, enforcing recipient existence, self-message, and block rules. |

Cookie-authenticated writes require the `XSRF-TOKEN` cookie and matching
`X-XSRF-TOKEN` header. Credentialed HTTP and Socket.IO access is enabled only
for the exact origins in `CORS_ORIGINS` (comma-separated; default
`http://localhost:3000`).
Configure cookie SameSite/secure settings for the deployment's origin and
HTTPS setup. Bearer tokens are stored as hashes and checked for expiry.

Two-factor authentication is not currently implemented in NestJS.

Messages are stored and returned through the REST API. After a message is
saved, Nest emits a `message.created` Socket.IO notification to the
authenticated recipient's user room. Socket.IO uses the same API host and port
as HTTP (default `http://localhost:3001`); it does not require Laravel/Reverb.
History remains REST-backed, and the client refetches it after notifications
and reconnects.

Check the service:

```bash
curl http://localhost:3001/up
curl http://localhost:3001/
```

- `GET /up` returns `{"status":"ok"}`.
- `GET /` returns the application name and status.

## Common commands

Run these from `nest-app/`:

| Command | Purpose |
| --- | --- |
| `bun run start:dev` | Start NestJS in watch mode. |
| `bun run build` | Compile the application. |
| `bun run start:prod` | Run the compiled application. |
| `bun run test` | Run unit tests. |
| `bun run test:e2e` | Run mocked HTTP tests and PostgreSQL-backed API flow tests. |
| `bun run db:test:migrate` | Apply Drizzle migrations to the isolated `nest_app_test` database only. |
| `bun run lint` | Check lint rules. |
| `bun run lint:fix` | Apply automatic lint fixes. |
| `bun run format` | Format TypeScript source and tests. |
| `docker compose logs -f nest-app` | Follow Nest PostgreSQL logs. |
| `docker compose stop` | Stop Nest PostgreSQL without deleting data. |

The e2e suite includes mocked tests for route wiring and a database-backed
integration flow for registration, session cookies, CSRF, login/logout, user
search, block rules, messaging, one-sided history deletion, and bearer-token
expiry. The test setup redirects only Nest database URLs to `nest_app_test` and
rejects other database names; it does not run against Laravel's database.
Start the Nest PostgreSQL service and prepare the test database once:

```bash
docker compose up -d nest-app
docker compose exec -T nest-app createdb -U nest nest_app_test
bun run db:test:migrate
bun run test:e2e
```

If the test database already exists, omit the `createdb` command. When changing
the local PostgreSQL username, use that username in the `createdb` command.
Do not use `docker compose down -v` unless you intend to permanently delete the
Nest database volume and all data in it.

## Database schema and migrations

Drizzle's user table and inferred types live in
`src/database/users.schema.ts`, and the message table and its inferred types
live in `src/database/conversations.schema.ts`. The other tables and combined
schema exports live in `src/database/schema.ts`; generated SQL migrations live
in `drizzle/`.

```bash
bun run db:generate
bun run db:migrate
bun run db:test:migrate
```

`db:generate` creates SQL from schema changes. `db:migrate` applies pending
migrations to the Nest database in `DATABASE_URL`.
`db:test:migrate` derives connection credentials from the same local
configuration but forces the database path to `nest_app_test`; it refuses URLs
that do not name the Nest application or its test database.

The initial migration creates the tables in the isolated Nest database. It does
not import data from another application. Never apply migrations to a
shared/existing database without verifying its schema and migration history.

Never run a migration against production or a shared database without
confirming the target database and reviewing the generated SQL.

## Project layout

```text
nest-app/
├── compose.yaml             # Isolated Nest PostgreSQL service
├── drizzle/                 # Generated SQL migrations and metadata
├── src/
│   ├── database/
│   │   ├── users.schema.ts         # User table and inferred user types
│   │   ├── conversations.schema.ts # Message table and inferred message types
│   │   ├── schema.ts               # Remaining tables and combined exports
│   │   └── database.service.ts
│   ├── app.controller.ts    # Root status and health endpoints
│   ├── auth/                 # Cookie auth, CSRF, and bearer tokens
│   ├── users/                # User search/details and blocking
│   ├── conversations/        # Message sending, history, and deletion
│   ├── app.module.ts         # Application configuration and modules
│   └── main.ts               # NestJS bootstrap
├── test/                    # Mock-backed HTTP endpoint tests
├── .env.example             # Local configuration template
└── package.json             # Scripts and dependencies
```

For the full migration sequence and Laravel behavior inventory, see
[`../docs/laravel-to-nestjs-migration-plan.md`](../docs/laravel-to-nestjs-migration-plan.md).
