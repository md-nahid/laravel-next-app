# Next.js authentication with NestJS

The Next.js app authenticates with the NestJS API using server-side sessions
and cookies. The browser calls the NestJS API directly, so the API must allow
credentialed requests from the frontend's exact origin.

For local setup and deployment notes, see the [Next.js README](../README.md) and
[NestJS README](../../nest-app/README.md).

## Request flow

The client API base URL is configured in `.env.local`:

```dotenv
NEXT_PUBLIC_REST_API_ENDPOINT=http://localhost:3001/api
```

Before registration or login, the client requests
`GET http://localhost:3001/csrf-cookie`. Nest responds with an opaque HttpOnly
`nest_session` cookie and a readable `XSRF-TOKEN` cookie. Axios is configured
to send credentials and the XSRF token. In local development, both apps use
`localhost`, so the browser can send the cookies between the different ports.

Set `CORS_ORIGINS` in Nest's environment to the exact browser origin, such as
`http://localhost:3000`. Nest allows credentialed HTTP and Socket.IO
connections only from configured origins. When using separate
hostnames in production, configure `SESSION_COOKIE_DOMAIN` to a shared parent
domain so the browser can send the session cookie and the frontend can read the
CSRF cookie. For example, use `.example.com` when the frontend and API are
hosted at `app.example.com` and `api.example.com`. Use HTTPS and secure cookies
in production.

## Routes used by the frontend

| Method | API path | Purpose |
| --- | --- | --- |
| `GET` | `/csrf-cookie` | Initialize session and CSRF cookies. |
| `POST` | `/register` | Register and start a session. |
| `POST` | `/login` | Authenticate and start a session. |
| `POST` | `/logout` | Invalidate the current session. |
| `GET` | `/api/user` | Load the current user. |
| `GET` | `/api/users` and `/api/users/:id` | List or view users. |
| `POST` / `DELETE` | `/api/blocks/:userId` | Block or unblock users. |
| `GET` / `POST` / `DELETE` | `/api/conversations/:partnerId` | Read, send, or hide conversation history. |

Cookie-authenticated write requests require the XSRF cookie and matching
`X-XSRF-TOKEN` header. Successful registration returns HTTP 201 and establishes
the session. Login returns HTTP 200 after the session is established. Two-factor
authentication is not currently implemented. The Nest database is independent
and empty by default; existing users and sessions are not automatically
available.

Realtime chat opens a Socket.IO connection to the origin of
`NEXT_PUBLIC_REST_API_ENDPOINT`; it uses the same session cookie and does not
send session IDs or tokens in the connection URL. The client joins no
user-selected room: Nest assigns the authenticated user's room after verifying
the session.

## Security notes

- Keep the session cookie `HttpOnly`, and use `Secure` cookies over HTTPS in
  production.
- Do not put session IDs or bearer tokens in `localStorage`.
- Set `CORS_ORIGINS` to specific trusted frontend origins; do not use `*` with
  credentialed requests.
- Keep frontend and API under the same parent domain when using session
  cookies. For unrelated domains, browser third-party-cookie restrictions may
  prevent session authentication from working reliably.
