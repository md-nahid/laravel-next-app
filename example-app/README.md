# example-app (API)

Headless Laravel 13 backend that exposes a JSON API for the separate Next.js frontend. Authentication uses Laravel Sanctum SPA cookies with Laravel Fortify in headless mode.

- PHP: 8.4
- Database: PostgreSQL 17
- Auth: Fortify + Sanctum
- Frontend: separate app in `../next-app`
- Tooling: Composer, Pint, PHPUnit, Laravel Boost MCP

## Prerequisites

Before the first run, make sure you have:

- Docker Desktop or Docker Engine + Compose v2
- A terminal with `docker` available
- Optionally: Node.js or Bun for the frontend app

## First-time run

From the `example-app/` directory:

```bash
cp .env.example .env
docker compose up -d --build
```

The first startup can take a few minutes while Docker builds the PHP image, installs Composer dependencies, creates the database, and runs migration setup.

When the stack is ready, verify the API is responding:

```bash
curl http://localhost:8000/up
```

You should get an HTTP 200 response. The app is available at:

- API: http://localhost:8000
- Health check: http://localhost:8000/up
- Reverb websocket server: http://localhost:8080

### What happens on first boot

The Docker startup script automatically does the following:

- copies `.env.example` to `.env` if it does not exist
- generates an `APP_KEY` if needed
- runs `composer install`
- fixes storage/cache permissions
- runs migrations
- starts the Laravel dev server

This means you usually do not need to run a separate setup step on a fresh machine.

## Start the frontend

This API is meant to be used with the Next.js frontend in `../next-app`.

Open a second terminal and run:

```bash
cd ../next-app
npm install
npm run dev
```

If you use Bun instead, this is the equivalent:

```bash
cd ../next-app
bun install
bun run dev
```

Then open:

- Frontend: http://localhost:3000
- API: http://localhost:8000

## Common Docker commands

From the `example-app/` directory:

```bash
docker compose up -d --build    # start the full stack in the background
docker compose ps               # check container status
docker compose logs -f app      # tail the Laravel API logs
docker compose logs -f postgres # tail PostgreSQL logs
docker compose logs -f queue    # tail the queue worker logs
docker compose logs -f reverb   # tail Reverb logs
docker compose stop             # stop without removing data
docker compose down             # stop containers and keep data
docker compose down -v          # stop and remove volumes (destroys local DB data)
```

Run Artisan commands inside the app container:

```bash
docker compose exec app php artisan migrate
docker compose exec app php artisan tinker
docker compose exec app php artisan test
```

## Database notes

The project uses PostgreSQL running in Docker. The default database credentials are defined in `.env.example`:

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=example_app
DB_USERNAME=laravel
DB_PASSWORD=secret
```

On first boot, Postgres creates both of these databases:

- `example_app` for normal development
- `example_app_testing` for PHPUnit

If you want to inspect the database locally from the host, connect to:

```bash
docker exec -it example-app-postgres psql -U laravel -d example_app
```

## Reset local data

If you want to start completely fresh:

```bash
docker compose down -v && docker compose up -d --build
```

This removes the Docker volumes and recreates the database from scratch.

## Optional: run PHP on the host

If you prefer to run Laravel without Docker, you can start only Postgres and then run the app locally:

```bash
docker compose up -d postgres
composer run setup
composer run dev
```

When running PHP on the host, set `DB_HOST=127.0.0.1` in your `.env` file.

## Authentication flow

The Next.js app talks to this API on a different origin, usually `http://localhost:3000` to `http://localhost:8000`.

1. Request a CSRF cookie before state-changing requests:
   `GET /sanctum/csrf-cookie`
2. Register or log in via Fortify endpoints:
   `POST /register`, `POST /login`, `POST /logout`
3. Authenticated requests use the session cookie automatically.

The relevant defaults are already configured in `.env.example`:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
SESSION_DOMAIN=localhost
SESSION_SAME_SITE=lax
SESSION_SECURE_COOKIE=false
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
```

See [docs/docker.md](docs/docker.md) for the full Docker architecture and troubleshooting guide.

### Quick Next.js fetch example

```ts
const api = (path: string, init: RequestInit = {}) =>
  fetch(`http://localhost:8000${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": decodeURIComponent(
        document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ""
      ),
      ...(init.headers ?? {}),
    },
    ...init,
  });

await api("/sanctum/csrf-cookie");
await api("/login", { method: "POST", body: JSON.stringify({ email, password }) });
const user = await api("/api/user").then((r) => r.json());
```

## Common tasks

```bash
php artisan migrate            # run migrations
php artisan migrate:fresh
php artisan tinker             # REPL
php artisan route:list         # inspect routes
```

## Quality checks

```bash
composer run lint              # Pint - fix
composer run lint:check        # Pint - check only
composer run test              # PHPUnit (also runs lint:check)
composer run ci:check          # full CI bundle
```

## Deploying to Laravel Cloud

The Cloud CLI is already installed globally and the `deploying-laravel-cloud` skill is registered in `boost.json`.

```bash
cloud login                    # one-time browser OAuth
cloud init                     # link this directory to a Cloud project + environment
cloud deploy                   # deploy current branch
```

Useful commands: `cloud environments`, `cloud logs`, `cloud env:pull`, `cloud env:push`, `cloud db:shell`, `cloud --help`.

CLI docs: [https://cloud.laravel.com/docs/api/cli](https://cloud.laravel.com/docs/api/cli)

When deploying, set the equivalent of `FRONTEND_URL` and `SANCTUM_STATEFUL_DOMAINS` to your production Next.js domain, and flip `SESSION_SECURE_COOKIE=true`.

## Project layout (cheatsheet)

```
app/
  Http/Controllers/     # HTTP controllers (currently only base Controller)
  Models/User.php       # uses HasApiTokens, TwoFactorAuthenticatable
routes/
  web.php               # JSON root + Fortify-registered web auth routes
  api.php               # /api/* routes (auth:sanctum)
  console.php           # Artisan closures
config/
  cors.php              # CORS for Next.js SPA
  fortify.php           # views: false (headless / JSON)
  sanctum.php           # SPA stateful domains
database/
  migrations/           # Schema migrations
docker/postgres/init/   # SQL/shell init scripts run on first Postgres boot
docs/docker.md          # Docker setup guide
compose.yaml            # Docker Compose: app + Postgres services
Dockerfile              # PHP 8.4 image for the Laravel API
docker/entrypoint.sh    # bootstraps deps, migrations, then serves the API
AGENTS.md               # Laravel Boost guidelines (loaded by AI agents)
boost.json              # Boost configuration
```

