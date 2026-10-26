# Production deployment: Vercel, NestJS, and Neon

This guide deploys the Next.js frontend to Vercel, uses Neon Postgres through
the Vercel Marketplace, and runs the NestJS API on a persistent Node.js host.
The Nest API is **not** deployed to Vercel in this setup: it starts a normal
HTTP server and Socket.IO server, so choose a backend host that supports
persistent Node processes and WebSocket upgrades.

Vercel Postgres is no longer available for new projects. Vercel connects to
external database providers through the Marketplace; Neon is one option with a
free plan. Check the current provider limits and pricing before relying on a
free tier.

## 1. Choose production domains

Use custom domains under the same parent domain so browser session and CSRF
cookies can be shared between the frontend and API:

| Service | Example |
| --- | --- |
| Next.js frontend | `https://app.example.com` |
| NestJS API | `https://api.example.com` |

You can choose other hostnames, but keep them under the same registrable
domain. The default `*.vercel.app` frontend domain and an unrelated API domain
are cross-site; browsers may block the session cookies this app requires.
Host the backend wherever you choose, and configure its custom domain and TLS
there.

## 2. Create a production PostgreSQL database

1. In Vercel, open **Integrations** or the **Marketplace**, choose a Postgres
   provider such as Neon, and create a database for this project.
2. Select a database region close to the NestJS backend region.
3. Create or select a **production** database/branch. Keep development and
   preview data separate from production.
4. Copy the provider's connection strings securely. Do not commit them or put
   them in a `NEXT_PUBLIC_` variable. The backend needs `DATABASE_URL`.
5. If the provider supplies both pooled and direct connection strings, use the
   appropriate runtime string for the Node `pg` pool and use a direct
   connection for migrations when the provider recommends it.

Vercel Marketplace integrations may add database variables to the Vercel
project. The NestJS host is a separate deployment, so also set its
`DATABASE_URL` in that host's encrypted environment settings.

## 3. Prepare the NestJS backend service

Create a Node.js service on a host that supports a long-running process and
Socket.IO/WebSocket upgrades. The exact screens and environment-variable UI
differ by host.

1. Connect the Git repository and set the service's root/directory to
   `nest-app`.
2. Set the runtime to Node.js 22 or a compatible version.
3. Configure the build command to install from the lockfile and compile Nest:

   ```bash
   bun install --frozen-lockfile && bun run build
   ```

   Use a Bun-enabled build environment. If your host uses Node package
   installation instead, configure it to install the dependencies from
   `package.json` and `bun.lock` reliably.
4. Set the start command:

   ```bash
   bun run start:prod
   ```

   The application listens on `PORT` and binds to `0.0.0.0`. Let the host
   provide `PORT` if it assigns one.
5. Add the production environment variables from the table below. Use the
   Neon production connection string for `DATABASE_URL`, not a local or
   development URL.
6. Configure the service's custom domain, for example
   `api.example.com`, and enable HTTPS.
7. Save the configuration, but do not send production traffic to the API
   until you have applied the migrations in the next step.

### NestJS production environment

Set these in the backend host's **production** environment. Values below are
examples; replace domains and secrets with your own.

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Provided by the backend host |
| `DATABASE_URL` | Production Neon PostgreSQL URL; secret |
| `CORS_ORIGINS` | `https://app.example.com` |
| `SESSION_COOKIE_NAME` | `nest_session` |
| `SESSION_COOKIE_DOMAIN` | `.example.com` |
| `SESSION_SAME_SITE` | `lax` |
| `SESSION_SECURE_COOKIE` | `true` |
| `SESSION_LIFETIME` | `120` |

`CORS_ORIGINS` must be the exact browser origin, with scheme and no path or
trailing slash. Do not use `*` with credentialed cookies. If the frontend has
more than one trusted production origin, list them comma-separated.

## 4. Apply production migrations and start the API

Apply the committed Drizzle migrations before sending production traffic to a
new API deployment. Run migrations from `nest-app/` with the production
database URL supplied securely to the command environment:

```bash
bun install --frozen-lockfile
bun run db:migrate
```

For example, set `DATABASE_URL` in a secure one-off shell/session or use your
database provider's trusted CLI environment integration before running the
commands. Do not print, commit, or paste the connection string into source
control. Verify that the migration target is the production Nest database
before applying migrations.

After migrations succeed, deploy or start the NestJS service configured in the
previous step. Check:

```text
https://api.example.com/up
```

It should return `{"status":"ok"}`. Confirm the host supports WebSocket
upgrades and that the Socket.IO endpoint is reachable through the custom
domain.

Do not use `docker compose down -v`, drop the production database, or otherwise
reset production data as part of deployment. For future schema changes, review
the generated SQL, back up important data, and apply the additive migration
before deploying code that depends on it.

## 5. Deploy the Next.js frontend to Vercel

1. Import the Git repository as a new Vercel project.
2. Set **Root Directory** to `next-app`. The app does not import code from
   outside that directory.
3. Let Vercel detect Next.js and use its standard build settings. Let it
   install from `bun.lock`; if needed, set the install command to
   `bun install --frozen-lockfile`.
4. Add this project environment variable for **Production**:

   ```text
   NEXT_PUBLIC_REST_API_ENDPOINT=https://api.example.com/api
   ```

   This URL is intentionally public: browser requests and the Socket.IO
   client use it. Never put secrets in `NEXT_PUBLIC_` variables.
5. Assign the frontend custom domain, for example `app.example.com`, and
   complete Vercel's DNS instructions.
6. Deploy and open the production URL.

Changing `NEXT_PUBLIC_REST_API_ENDPOINT` requires a new frontend deployment.

## 6. Verify authentication, chat, and realtime behavior

From the production frontend:

1. Open browser developer tools and confirm requests go to
   `https://api.example.com`.
2. Register a new account or log in. Confirm the browser accepts the
   `nest_session` and `XSRF-TOKEN` cookies for `.example.com`, with `Secure`
   enabled.
3. Send messages in both directions and verify the conversation history loads.
4. Keep both users connected and check that Socket.IO message notifications
   update the chat in realtime.
5. Test logout and log back in.

If requests fail, check the backend logs and verify the frontend origin exactly
matches `CORS_ORIGINS`, both domains use HTTPS, and the cookie domain is the
shared parent domain.

## 7. Preview, scaling, and operational notes

- Vercel preview URLs are not automatically included in the production CORS
  allowlist. Keep previews isolated from production data. If you need
  authenticated previews, use a trusted staging hostname under your own
  domain and a separate staging API/database; do not allow every Vercel
  preview origin with a broad wildcard.
- Start with a single NestJS instance. The current Socket.IO gateway keeps
  user rooms in process memory. If you scale to multiple API instances, add a
  shared Socket.IO adapter such as Redis and verify sticky-connection and
  cross-instance behavior for your host.
- Keep production and development database URLs separate. Never reset the
  production database to test a deployment.
- Configure database backups/point-in-time recovery and review the database
  provider's connection limits and free-plan quotas.

## References

- [Vercel: Postgres through the Marketplace](https://vercel.com/docs/postgres)
- [Vercel Marketplace: Neon](https://vercel.com/marketplace/neon)
- [Vercel: WebSockets on Functions](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)
- [NestJS deployment guidance](https://docs.nestjs.com/deployment)
- [NestJS API setup and configuration](../../nest-app/README.md)
- [Frontend authentication and cookie requirements](./frontend-login-registration.md)
