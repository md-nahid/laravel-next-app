# Realtime Chat Setup

This project uses Laravel Reverb and Laravel Echo to deliver new chat messages without a browser refresh.

## 1. Install dependencies

From `example-app`:

```bash
composer install
```

From `next-app`:

```bash
bun install
```

The required packages are Laravel Reverb on the backend and `laravel-echo` plus `pusher-js` on the frontend.

## 2. Configure the Laravel environment

Copy `example-app/.env.example` to `example-app/.env` if the local environment file does not exist. Keep these local values in `example-app/.env`:

```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=local
REVERB_APP_KEY=local
REVERB_APP_SECRET=local
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
```

The frontend must be included in the existing Sanctum stateful domains:

```env
FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
```

When running with Docker Compose, Laravel containers connect to Reverb using
the internal service name `reverb`. The browser continues to connect through
`localhost:8080`; these are intentionally different hosts.

## 3. Configure the Next.js environment

Keep these values in `next-app/.env.local` for local development:

```env
NEXT_PUBLIC_REST_API_ENDPOINT=http://localhost:8000/api
NEXT_PUBLIC_REVERB_APP_KEY=local
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
```

The same variable names are documented in `next-app/.env.example`.

## 4. Start the backend services

From `example-app`, run one command:

```bash
docker compose up -d
```

Compose starts the Laravel API, PostgreSQL, queue worker, and Reverb automatically. The default local WebSocket server is available at `ws://localhost:8080`.

## 5. Start Next.js

From `next-app`:

```bash
bun run dev
```

Open two browser sessions, sign in as different users, and open the same conversation. A message sent by one user should appear for the other user automatically.

## 6. How delivery works

1. `ConversationController` stores the message.
2. `MessageSent` broadcasts the saved conversation to the recipient's private `users.{userId}` channel.
3. `routes/channels.php` authorizes only that user to subscribe.
4. Next.js Echo receives `.message.sent` and invalidates the active conversation query.
5. TanStack Query fetches the updated conversation without a manual refresh.

## Production notes

Use HTTPS and secure WebSockets in production. Replace the local Reverb credentials and host with production values, set `REVERB_SCHEME=https`, and configure the production domain in `FRONTEND_URL` and `SANCTUM_STATEFUL_DOMAINS`. Reverb and a queue worker must remain running in production.
