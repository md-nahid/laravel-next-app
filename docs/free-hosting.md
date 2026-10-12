# Free test deployment

This setup uses free tiers for a temporary test deployment:

- **Vercel Hobby** serves the Next.js frontend.
- **Render Free** runs the Laravel API and Reverb websocket server.
- **Neon Free** provides PostgreSQL.

The API proxy keeps browser requests and Sanctum session cookies on the
frontend's Vercel origin, so a custom domain is not required. This is a test
setup, not production hosting: Render services sleep after 15 minutes without
traffic, can take about a minute to wake, and share 750 free instance hours per
workspace per month. Render's filesystem is temporary, so uploaded files are
not retained. Use Neon rather than Render's free Postgres, which expires after
30 days.

## 1. Create the database

1. Create a free project at [Neon](https://neon.tech/).
2. Copy the pooled connection string for the project's database. It should use
   PostgreSQL and require SSL.
3. Keep the connection string private; add it to the Render environment as
   `DB_URL`.

## 2. Deploy the Laravel API and Reverb

Create two **Web Services** from this repository in Render, both with the
**Free** instance type:

| Setting | Laravel API | Reverb |
| --- | --- | --- |
| Root Directory | `example-app` | `example-app` |
| Runtime | Docker | Docker |
| Dockerfile Path | `./Dockerfile.production` | `./Dockerfile.production` |
| Docker Context Directory | `.` | `.` |
| Start Command | Leave empty | `reverb` |
| Health Check Path | `/up` | Leave empty |

Set these variables on **both** services:

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Output of `cd example-app && php artisan key:generate --show` |
| `REVERB_APP_ID` | Any private identifier, e.g. `test-app` |
| `REVERB_APP_KEY` | A random private value |
| `REVERB_APP_SECRET` | A different random private value |
| `REVERB_HOST` | The Reverb service host, e.g. `your-reverb-name.onrender.com` |
| `REVERB_PORT` | `443` |
| `REVERB_SCHEME` | `https` |

Use the **same** `APP_KEY`, `REVERB_APP_ID`, `REVERB_APP_KEY`, and
`REVERB_APP_SECRET` on both services. Generate secrets privately and enter
them directly in Render; never commit them or send them here.

Set these additional variables on the **Laravel API** service:

| Variable | Value |
| --- | --- |
| `APP_URL` | The API service's `https://...onrender.com` URL |
| `DB_CONNECTION` | `pgsql` |
| `DB_URL` | The Neon pooled connection string |
| `DB_SSLMODE` | `require` |
| `FRONTEND_URL` | The Vercel URL, e.g. `https://your-project.vercel.app` |
| `SANCTUM_STATEFUL_DOMAINS` | The Vercel hostname only, e.g. `your-project.vercel.app` |
| `SESSION_DRIVER` | `database` |
| `SESSION_DOMAIN` | Leave blank |
| `SESSION_SAME_SITE` | `lax` |
| `SESSION_SECURE_COOKIE` | `true` |
| `CACHE_STORE` | `database` |
| `QUEUE_CONNECTION` | `sync` |
| `BROADCAST_CONNECTION` | `reverb` |

Set `REVERB_SERVER_PORT` to `10000` on the Reverb service. Leave
`REVERB_SERVER_HOST` unset so it listens on `0.0.0.0`.

## 3. Deploy the frontend

1. Import the repository into [Vercel](https://vercel.com/).
2. Set the project **Root Directory** to `next-app`.
3. Add these environment variables before deploying:

| Variable | Value |
| --- | --- |
| `LARAVEL_API_URL` | The Laravel API's `https://...onrender.com` URL |
| `NEXT_PUBLIC_REST_API_ENDPOINT` | `https://your-project.vercel.app/backend` |
| `NEXT_PUBLIC_REVERB_APP_KEY` | The same value as Laravel's `REVERB_APP_KEY` |
| `NEXT_PUBLIC_REVERB_HOST` | The Reverb service hostname without `https://` |
| `NEXT_PUBLIC_REVERB_PORT` | `443` |
| `NEXT_PUBLIC_REVERB_SCHEME` | `https` |

Use the Vercel project name to determine its `your-project.vercel.app` URL.
After the first deployment, confirm it matches the URL entered above. If
Vercel assigned a different URL, update `NEXT_PUBLIC_REST_API_ENDPOINT`,
`FRONTEND_URL`, and `SANCTUM_STATEFUL_DOMAINS`, then redeploy.

The Next.js rewrites proxy login, registration, CSRF, API, and broadcast
authorization requests to Laravel. This is necessary for Sanctum's browser
session cookies to work on the default free hostnames.

## 4. Test it

- Open the Vercel URL and register a test user.
- Create a second test account in a private browser window to try chat.
- The first request after an idle period may take about a minute while Render
  wakes the API and websocket services.
- Render's free services may restart or sleep, and local file uploads are
  temporary. Do not use this deployment for real user data.
