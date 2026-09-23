# example-app (API)

Headless Laravel 13 backend that exposes a JSON API consumed by a separate Next.js frontend. Authentication uses **Laravel Sanctum** SPA cookie auth on top of **Laravel Fortify** in headless mode.

- **PHP**: 8.4
- **Database**: PostgreSQL 17 (run locally via Docker Compose)
- **Auth**: Fortify (headless / JSON) + Sanctum SPA cookies
- **Frontend**: lives in a separate Next.js project — this repo has no JS build pipeline
- **Tooling**: Pint, PHPUnit, Laravel Boost MCP

## Prerequisites


| Tool                    | Notes                                                 |
| ----------------------- | ----------------------------------------------------- |
| Docker + Docker Compose | runs the API and Postgres locally                     |
| PHP + Composer          | optional — only needed if you run the app outside Docker |
| Node.js + npm           | only used by `npx concurrently` in `composer run dev` |
| Laravel installer       | `composer global require laravel/installer`           |
| Laravel Cloud CLI       | `composer global require laravel/cloud-cli`           |


Make sure Composer's global bin is on your `PATH`:

```bash
export PATH="$HOME/.composer/vendor/bin:$PATH"
```

## First-time setup

See **[docs/docker.md](docs/docker.md)** for the full Docker guide (architecture, env vars, troubleshooting, and how the setup was built).

```bash
cp .env.example .env                # if you don't already have a .env
docker compose up -d --build        # start Postgres + the Laravel API
```

On first boot the `app` container will install Composer dependencies, generate an `APP_KEY` if needed, run migrations, and serve the API on port `8000`.

- API root: [http://localhost:8000](http://localhost:8000)
- Health check: [http://localhost:8000/up](http://localhost:8000/up)

### Without Docker (optional)

If you prefer running PHP on the host:

```bash
docker compose up -d postgres     # Postgres only
composer run setup                # install + .env + key + migrate
composer run dev                  # php artisan serve + queue + logs
```

`composer run setup` expects Postgres to be reachable. Use `DB_HOST=127.0.0.1` in `.env` when running PHP on the host.

## Database (PostgreSQL via Docker)

Postgres runs in Docker alongside the Laravel API. On first boot it creates two databases owned by the `laravel` user:


| Database              | Purpose                                 |
| --------------------- | --------------------------------------- |
| `example_app`         | development (used by `php artisan ...`) |
| `example_app_testing` | PHPUnit (`phpunit.xml` points here)     |


Default credentials (from `.env.example`):

```env
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=example_app
DB_USERNAME=laravel
DB_PASSWORD=secret
```

`DB_HOST=postgres` is the Docker Compose service name. If you run PHP on the host instead of the `app` container, change it to `127.0.0.1`.

### Common Docker commands

```bash
docker compose up -d --build    # start Postgres + API in the background
docker compose ps               # check status / health
docker compose logs -f app      # tail API logs
docker compose logs -f postgres # tail database logs
docker compose stop             # stop without removing volumes
docker compose down             # stop + remove containers (data persists in volumes)
docker compose down -v          # stop + remove containers AND volumes (DESTROYS data)
```

Run one-off Artisan commands inside the app container:

```bash
docker compose exec app php artisan migrate
docker compose exec app php artisan tinker
docker compose exec app php artisan test
```

### Connect with `psql`

```bash
docker exec -it example-app-postgres psql -U laravel -d example_app
```

### Connect with TablePlus

1. Make sure the container is running: `docker compose up -d`.
2. In TablePlus, click **Create a new connection** (or `⌘N`) and pick **PostgreSQL**.
3. Fill in the connection sheet using the values from `.env`:

  | Field    | Value                                     |
  | -------- | ----------------------------------------- |
  | Name     | `example-app (local)` (anything you like) |
  | Host     | `127.0.0.1`                               |
  | Port     | `5432`                                    |
  | User     | `laravel`                                 |
  | Password | `secret`                                  |
  | Database | `example_app`                             |
  | SSL mode | `prefer` (or leave default)               |

4. Click **Test** — you should see "Connection OK". Then **Save** and **Connect**.
5. Optional: duplicate the connection (right-click → **Duplicate**) and change Database to `example_app_testing` to inspect the PHPUnit database too.

If TablePlus reports `connection refused`, check `docker compose ps` and confirm `example-app-postgres` is `healthy`. If a different Postgres is already bound to `5432` on your host, change `DB_PORT` in `.env`, restart the container (`docker compose down && docker compose up -d`), and use the new port in TablePlus.

### Reset local data

```bash
docker compose down -v && docker compose up -d --build
```

## Development server

### Docker (recommended)

```bash
docker compose up -d --build
```

The API is available at [http://localhost:8000](http://localhost:8000). Code changes on your host are reflected immediately because the project directory is mounted into the container.

Stop everything with:

```bash
docker compose down
```

### Host PHP (optional)

`composer run dev` boots PHP, the queue worker, and the Pail log tailer together with grouped output (no Vite — there's no frontend in this project).

#### Start

```bash
docker compose up -d postgres     # Postgres only
composer run dev
```

After it boots:

- API root: [http://localhost:8000](http://localhost:8000)
- Health check: [http://localhost:8000/up](http://localhost:8000/up)
- Postgres: `127.0.0.1:5432` (database `example_app`)

#### Stop

`Ctrl+C` in the terminal running `composer run dev` (kills the whole group via `concurrently --kill-others`).

If it was started in the background and you've lost the terminal:

```bash
pkill -f "concurrently.*artisan serve"
lsof -ti tcp:8000 | xargs kill        # php artisan serve
```

Postgres keeps running on its own; stop it with `docker compose stop` when you're done for the day.

#### Run pieces individually

```bash
php artisan serve              # PHP only
php artisan queue:listen       # queue only
php artisan pail               # log tail only
```

## Authentication flow (for the Next.js client)

The Next.js app talks to this API on a different origin (default `http://localhost:3000` → `http://localhost:8000`). CORS and Sanctum are pre-configured for that pairing.

1. Client must request the CSRF cookie before any state-changing request:
  ```
   GET  /sanctum/csrf-cookie         (sets XSRF-TOKEN + laravel-session cookies)
  ```
2. Login / register / logout via Fortify endpoints, sending the CSRF token in the `X-XSRF-TOKEN` header:
  ```
   POST /register   { name, email, password, password_confirmation }
   POST /login      { email, password }
   POST /logout
  ```
3. Authenticated calls use the session cookie automatically (`credentials: "include"` in fetch / Axios):
  ```
   GET  /api/user                    (returns the authenticated user as JSON)
  ```

### Relevant config knobs (in `.env` / `.env.example`)

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

SESSION_DOMAIN=localhost
SESSION_SAME_SITE=lax
SESSION_SECURE_COOKIE=false      # set to true in production over HTTPS

SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
```

- `config/cors.php` allows the origins listed in `FRONTEND_URL` (comma-separated for multiple) with `supports_credentials: true`.
- `config/fortify.php` has `views => false` so Fortify returns JSON instead of rendering Blade.

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

