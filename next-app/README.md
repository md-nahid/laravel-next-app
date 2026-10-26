# Next.js chat frontend

This is the Next.js frontend for the NestJS API in [`../nest-app`](../nest-app).
The browser calls the NestJS API directly. Nest handles authentication,
authorization, and database access.

For production deployment to Vercel with Neon and a persistent NestJS host,
see the [deployment guide](./docs/deployment.md).

## Onboarding: run the app locally

### Prerequisites

- Node.js 22 LTS
- Bun 1.3.14 or compatible
- Docker Desktop/Engine with Docker Compose

### 1. Set up the NestJS API and database

From the repository root, open a terminal and install backend dependencies:

```bash
cd nest-app
bun install
```

Create `nest-app/.env` from the example if it does not already exist:

```bash
cp .env.example .env
```

Start the Nest PostgreSQL service, apply the database migrations, and start the
API:

```bash
docker compose up -d nest-app
bun run db:migrate
bun run start:dev
```

Keep this terminal open. The API listens at `http://localhost:3001`. In another
terminal, verify that it is responding:

```bash
curl http://localhost:3001/up
```

The response should be `{"status":"ok"}`. For backend setup details and API
routes, see the [NestJS README](../nest-app/README.md).

### 2. Set up and start the Next.js frontend

From the repository root, open a second terminal, install frontend dependencies,
and create `next-app/.env.local` if it does not already exist:

```bash
cd next-app
bun install
cp .env.example .env.local
```

The example values work when Next.js and NestJS run directly on your computer:

```dotenv
NEXT_PUBLIC_REST_API_ENDPOINT=http://localhost:3001/api
```

If `.env.local` already exists, update `NEXT_PUBLIC_REST_API_ENDPOINT` there;
Next.js does not replace existing environment files when the example is edited.

Start the frontend:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), register a NestJS account,
and sign in. Keep both the frontend and backend terminals running while you use
the app.

### Service URLs and ports

| Service | Local address | Purpose |
| --- | --- | --- |
| Next.js | `http://localhost:3000` | Web frontend |
| NestJS | `http://localhost:3001` | API and session authentication |
| Nest PostgreSQL | `localhost:5433` | NestJS database, isolated from Laravel |

## How the frontend connects to NestJS

`NEXT_PUBLIC_REST_API_ENDPOINT` is the browser-facing NestJS API base.
Login and registration initialize CSRF/session cookies through
`http://localhost:3001/csrf-cookie`; feature requests use
`http://localhost:3001/api/*`. Set the variable to the public NestJS API URL
when deploying; it must be reachable from the user's browser.

Because these requests are cross-origin, Nest's `CORS_ORIGINS` must include the
exact frontend origin and allow credentials. In local development, the
frontend and API both use `localhost`, so their cookies are shared across the
different ports. In production, use HTTPS and configure the Nest session
cookie domain so the frontend can read the CSRF cookie (for example,
`.example.com` when the frontend and API use sibling subdomains). See the
authentication notes for cookie and CORS requirements.

Realtime chat connects Socket.IO to the origin of
`NEXT_PUBLIC_REST_API_ENDPOINT` (locally `http://localhost:3001`) and uses the
existing session cookie. Keep that API origin in Nest's `CORS_ORIGINS`; the
server validates the browser's WebSocket origin and authenticates the session
before joining the user's private room.

## Stopping local services

Stop the Next.js and NestJS dev servers with `Ctrl+C` in their terminals. To
stop the Nest PostgreSQL container without deleting its data:

```bash
cd nest-app
docker compose stop
```

The database is stored in a persistent Docker volume. Avoid `docker compose
down -v` unless you intend to delete that volume and its data.

## Current integration notes

- Authentication uses Nest-managed server-side sessions and CSRF-protected
  cookies.
- User lookup, blocking, messaging, and conversation history use the Nest API.
- Chat updates arrive over authenticated Socket.IO notifications; REST remains
  the source of truth for conversation history.
- Two-factor authentication is not currently implemented.
- The Nest database is separate and starts without existing users or messages.
  Laravel data and accounts are not automatically copied over.

## Checks

Run these commands from `next-app/`:

```bash
bun run typecheck
bun run lint
bun run build
```
