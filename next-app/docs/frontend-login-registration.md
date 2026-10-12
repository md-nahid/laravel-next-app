# Next.js authentication with NestJS

The Next.js app authenticates with the NestJS API using server-side sessions
and first-party cookies. The browser calls a same-origin Next.js rewrite at
`/backend/*`; Next forwards those requests to `NEST_API_INTERNAL_URL`.

For local setup and deployment notes, see the [Next.js README](../README.md) and
[NestJS README](../../nest-app/README.md).

## Request flow

The client API base URL is configured in `.env.local`:

```dotenv
NEXT_PUBLIC_REST_API_ENDPOINT=/backend/api
NEST_API_INTERNAL_URL=http://localhost:3001
```

Before registration or login, the client requests
`GET /backend/csrf-cookie`. Nest responds with an opaque HttpOnly
`nest_session` cookie and a readable `XSRF-TOKEN` cookie. Axios is configured
to send credentials and the XSRF token. The Next rewrite makes these
same-origin browser requests and forwards both cookies to Nest.

The rewrite target must be reachable from the Next.js server. For example, if
Next and Nest run as separate containers, configure `NEST_API_INTERNAL_URL`
with the Nest container's service hostname rather than `localhost`.

## Routes used by the frontend

| Method | Browser path | Purpose |
| --- | --- | --- |
| `GET` | `/backend/csrf-cookie` | Initialize session and CSRF cookies. |
| `POST` | `/backend/register` | Register and start a session. |
| `POST` | `/backend/login` | Authenticate and start a session. |
| `POST` | `/backend/logout` | Invalidate the current session. |
| `GET` | `/backend/api/user` | Load the current user. |
| `GET` | `/backend/api/users` and `/backend/api/users/:id` | List or view users. |
| `POST` / `DELETE` | `/backend/api/blocks/:userId` | Block or unblock users. |
| `GET` / `POST` / `DELETE` | `/backend/api/conversations/:partnerId` | Read, send, or hide conversation history. |

Cookie-authenticated write requests require the XSRF cookie and matching
`X-XSRF-TOKEN` header. Successful registration returns HTTP 201 and establishes
the session. Login returns HTTP 200 after the session is established. Two-factor
authentication is not currently implemented. The Nest database is independent
and empty by default; existing users and sessions are not automatically
available.

## Security notes

- Keep the session cookie `HttpOnly`, and use `Secure` cookies over HTTPS in
  production.
- Do not put session IDs or bearer tokens in `localStorage`.
- Keep `NEST_API_INTERNAL_URL` server-side; it is not a `NEXT_PUBLIC_` value.
- The same-origin rewrite is preferred over direct cross-origin cookie
  requests. If replacing it, configure CORS credentials, cookie policy, and
  CSRF handling for the deployed origins.
