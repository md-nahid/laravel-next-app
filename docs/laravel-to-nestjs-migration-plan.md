# Laravel to NestJS Migration Plan

This document is a step-by-step roadmap for replacing the Laravel API with a
NestJS backend while keeping the existing Next.js frontend. The migration should
be incremental: keep Laravel running until NestJS implements and passes the
same behavior for each feature. NestJS now uses a separate PostgreSQL
container/database; transferring existing Laravel data is a distinct migration
task and must be planned before NestJS replaces Laravel for existing users.

## Current application

- **Frontend:** Next.js in `../next-app`
- **Backend:** Laravel in `../example-app`
- **Database:** PostgreSQL
- **Authentication:** Fortify + Sanctum SPA authentication using session cookies
  and CSRF protection
- **Realtime chat:** Laravel Reverb, with Laravel Echo in the frontend
- **Core API features:** user search, user blocking, messaging, conversation
  history and per-user conversation deletion

Useful references:

- Laravel API routes: `../example-app/routes/api.php`
- Laravel auth and broadcast routes: `../example-app/routes/web.php` and
  `../example-app/routes/channels.php`
- Database schema: `../example-app/database/migrations/`
- Feature behavior and regression cases: `../example-app/tests/Feature/`
- Frontend API client: `../next-app/src/_api/client.ts`
- Frontend realtime client: `../next-app/src/lib/echo.ts`
- Frontend auth documentation: `../example-app/docs/frontend-login-registration.md`
- Realtime chat documentation: `../example-app/docs/realtime-chat.md`

## Migration principles

1. Keep both PostgreSQL databases isolated during dual-run. The NestJS database
   starts empty; plan and verify data transfer from Laravel before cutover.
2. Run NestJS beside Laravel during development and migration. Do not remove or
   replace Laravel before the NestJS implementation is verified.
3. Preserve existing endpoint behavior and response shapes where practical, so
   frontend changes can be limited to features that need them.
4. Treat the existing Laravel feature tests and frontend behavior as the
   specification. Add equivalent NestJS tests as features are ported.
5. Laravel owns migrations for its database; Drizzle owns migrations for the
   separate NestJS database. Do not point both applications at the same database
   without a reviewed migration baseline and explicit ownership plan.
6. Keep secrets out of source control. Use local environment files and the
   deployment platform's secret manager.

## Phase 1: Capture existing behavior

- [x] Inventory Laravel routes, middleware, request validation, responses, and
      status codes.
- [x] Record frontend calls to authentication, user, block, conversation, and
      realtime endpoints.
- [x] Review tests and capture edge cases, including unauthenticated requests,
      self-messaging, blocking, pagination, and per-user conversation deletion.
- [x] Document response formats and frontend compatibility requirements.

### Current endpoint and behavior inventory

| Method and path | Authentication | Current behavior / contract |
| --- | --- | --- |
| `GET /up` | None | Health check; expected HTTP 200. |
| `GET /` | None | JSON with application name and `status: "ok"`. |
| `GET /sanctum/csrf-cookie` | None; browser cookie flow | Establishes the CSRF cookie before login or registration. Frontend requests use credentials and send the XSRF header for state-changing requests. |
| `POST /register` | None; session-based | Fortify registration; validation errors use HTTP 422. Successful registration establishes a session. |
| `POST /login` | None; session-based | Fortify login by email/password; supports two-factor challenge and establishes a session on successful authentication. |
| `POST /logout` | Session-based | Invalidates the authenticated browser session. |
| `POST /api/tokens` | None; login-throttled | Validates email, password, and device name; returns HTTP 201 with `token` and `token_type: "Bearer"` for valid credentials. |
| `GET /api/user` | Sanctum | Returns the authenticated user profile. |
| `GET /api/users` | Sanctum | Excludes the authenticated user. Defaults to 10 results per page; `per_page` must be an integer from 1 to 100. `pagination=false` returns a raw array. Paginated responses use Laravel's paginator shape. The tested `search` contract filters by name or email, but the current controller does not apply the validated search parameter (see discrepancy below). |
| `GET /api/users/{id}` | Sanctum | Returns the user plus `is_blocked_by_me` and `is_blocking_me`; missing users return 404. |
| `POST /api/blocks/{userId}` | Sanctum | Creates a block; returns `{ "message": "User blocked." }`. Blocking yourself returns 422. Repeating a block is idempotent. |
| `DELETE /api/blocks/{userId}` | Sanctum | Removes a block; returns `{ "message": "User unblocked." }`. Removing a nonexistent block succeeds. |
| `GET /api/conversations/{partnerId}` | Sanctum | Returns paginated messages between the two users, default page size 100, maximum 100. Messages are ordered oldest-to-newest within the page and include nested `sender`, `receiver`, and `is_mine` fields. Applies the requesting user's deletion cutoff. |
| `POST /api/conversations/{receiverId}` | Sanctum | Requires a string `message` of at most 500 characters. The authenticated user is the sender. Returns HTTP 201; sender/receiver IDs are hidden in this response. Missing receiver returns 404, self-message returns 422, and sending to a user who has blocked the sender returns 403. |
| `DELETE /api/conversations/{partnerId}` | Sanctum | Hides messages through the latest message for this user only; does not delete message rows or the partner's history. Returns `{ "message": "Conversation deleted." }`. Missing partner returns 404; self-delete returns 422. |
| `POST /broadcasting/auth` | Sanctum session | Authorizes private `users.{userId}` channels only when the authenticated user's ID equals `userId`. |

### Frontend compatibility requirements

- The Next.js API client uses Axios with `withCredentials` and `withXSRFToken`,
  `Accept: application/json`, and `X-Requested-With: XMLHttpRequest`.
- The frontend calls `/sanctum/csrf-cookie` before registration and login;
  register/login/logout are root-level Fortify paths, not under `/api`.
- The chat UI consumes paginated conversation responses with nested participants
  and `is_mine`. It listens for the `.message.sent` event on a private per-user
  channel using Laravel Echo/Reverb.
- The broadcast payload contains `id`, `sender_id`, `receiver_id`, `message`,
  `created_at`, and `updated_at`.
- The current broadcast is sent to the receiver's private channel. Channel
  authorization must prevent a user from joining another user's channel.

### Discrepancy to resolve

`IndexUsersRequest` accepts `search`, and `ListUsersTest` expects searches to
match user name or email. However, `UserController::index` does not currently
filter by `search`. Treat name/email search as the tested intended behavior for
NestJS; separately confirm and fix the Laravel baseline if both backends need
to behave identically during a dual-run period.

**Complete:** The route and behavior inventory above is the baseline for
implementing and testing NestJS equivalents.

## Phase 2: Create and run the NestJS service

- [x] Create a separate NestJS project in `../nest-app/` alongside
      `example-app/` and `next-app/`.
- [x] Add configuration and environment validation, structured logging, and a
      health endpoint.
- [x] Set up TypeScript, formatting/linting, and unit/e2e test commands.
- [x] Configure NestJS to listen on a separate local port; leave Laravel and the frontend
      unchanged.
- [x] Confirm PostgreSQL connectivity and configure NestJS to use its isolated
      PostgreSQL database after selecting Drizzle in Phase 3.
- [x] Add a separate PostgreSQL 17 Compose service and persistent data volume
      for NestJS, isolated from Laravel's PostgreSQL service.
- [x] Start the isolated PostgreSQL service and verify it accepts connections
      on host port 5433.
- [ ] Add the NestJS API service to Docker Compose after validating its runtime
      configuration.

**Progress:** The NestJS scaffold, validated `PORT`/`NODE_ENV` configuration,
JSON console logging, `GET /` status response, `GET /up` health endpoint, and
unit/e2e test files are in place. Build, lint, unit tests, and e2e tests pass;
the service has connected to its own PostgreSQL database and returned HTTP 200
from `/` and `/up`. Its PostgreSQL 17 container runs separately from Laravel and
persists data in its own Docker volume. The project uses Node.js 22 LTS because
the current test tooling does not support Node.js 23. Compose integration for
the NestJS API service remains pending.

**Complete when:** NestJS starts locally and in Compose, reports healthy, and
connects only to its isolated PostgreSQL service.

## Phase 3: Define database schema and migrations

- [x] Choose Drizzle ORM with `drizzle-kit` and the `pg` driver for PostgreSQL.
- [x] Reproduce the existing schema, relationships, indexes, uniqueness rules,
      and delete behavior. Important application tables include users,
      conversations, user blocks, and conversation deletion cutoffs.
- [x] Compare live PostgreSQL column types, nullability, indexes, unique
      constraints, and foreign keys against the Laravel schema.
- [ ] Check Laravel-specific columns and password hash compatibility before
      writing user records from NestJS.
- [x] Generate an initial schema migration matching the current Laravel tables.
- [x] Record a baseline on the local Laravel database during initial schema
      verification; it is not used by NestJS's new database.
- [x] Create a separate NestJS PostgreSQL database and apply its fresh schema
      migration without modifying Laravel application data.
- [ ] Keep current data and use additive, reversible migrations where possible.
- [x] Keep Laravel as the schema migration owner for the Laravel database and
      Drizzle as the owner for the separate NestJS database.
- [ ] Plan and test a controlled transfer of required user and application data
      from Laravel into the isolated NestJS database before cutover.

**Progress:** Drizzle schema definitions and a fresh-database initial migration
are in place for users, sessions, password-reset tokens, personal access
tokens, conversations, blocks, and conversation deletion cutoffs. The NestJS
service validates `DATABASE_URL` and performs a read-only connection check at
startup. The Laravel database's column definitions, indexes, unique
constraints, and foreign keys were checked and match the Drizzle schema. A
separate PostgreSQL 17 service now runs for NestJS on host port 5433 with its
own persistent volume; Nest-specific schema migrations have been applied to
that empty database via `bun run db:migrate`. Laravel's application data and
tables remain unchanged. The isolated Nest database is not populated with
existing users or chat data yet; plan and test that data transfer before
switching the frontend. Do not point Nest at the Laravel database or
drop/recreate production tables.

**Complete when:** NestJS can read existing records and tests verify the
expected relationships and constraints, with migration ownership and baseline
handled safely.

## Phase 4: Port authentication and user profile

- [x] Implement registration, login, logout, and the authenticated current-user
      endpoint.
- [x] Match the existing bcrypt password hashing and password validation
      behavior.
- [x] Initially preserve the browser-facing Sanctum-style cookie and CSRF flow
      where feasible, including credentialed CORS and cookie settings.
- [x] Verify session creation, session invalidation, CSRF rejection, validation
      errors, and unauthenticated responses against an isolated test database.
- [ ] Update the frontend only as necessary and test in a browser.

The Nest implementation now issues database-backed sessions and Sanctum-format
personal access tokens, enforces CSRF for cookie-authenticated writes, and
supports Fortify TOTP/recovery-code challenges for existing 2FA accounts when
`LARAVEL_APP_KEY` is configured. A PostgreSQL-backed e2e flow now verifies
registration, sessions, CSRF, normal login/logout, token expiry, and protected
profile access. The app does not yet import Laravel users, tokens, or sessions;
2FA enrollment, password resets, email verification, and browser/proxy
verification are also not ported.

**Important decision:** Replacing session cookies with JWT is a separate
authentication redesign, not a transparent backend conversion. It affects
frontend credential handling and should be decided deliberately before
implementation.

**Complete when:** The Next.js app can register, log in, reload while remaining
authenticated, fetch the current user, and log out against NestJS.

## Phase 5: Port user and blocking APIs

- [x] Implement authenticated user listing and name/email search with matching pagination
      and response formats.
- [x] Implement the user detail response, including the current block state.
- [x] Implement block and unblock operations.
- [x] Preserve authorization and validation behavior, including handling
      invalid or missing user IDs.
- [x] Port or recreate the corresponding Laravel feature tests as NestJS tests.

Search is implemented as a case-insensitive name-or-email match, consistent
with the Laravel feature-test expectation; the current Laravel controller
accepts but does not apply its `search` parameter. Isolated PostgreSQL coverage
checks search and directional block behavior.

**Complete when:** User search and block management work through NestJS, and
the existing frontend can use them without unrelated changes.

## Phase 6: Port messaging and conversation history

- [x] Implement message creation with the authenticated user as sender.
- [x] Validate receiver existence, prevent self-messaging, and preserve the
      current blocking rules.
- [x] Implement conversation history, sorting, pagination, and nested sender
      and receiver data expected by the UI.
- [x] Implement per-user conversation deletion using the current deletion
      cutoff behavior. Deleting one user's view must not remove the partner's
      history.
- [x] Port regression cases for message participants, blocking, pagination,
      missing users, self-messaging, and repeated deletion.

PostgreSQL-backed e2e coverage verifies messages, directional blocking,
history ordering, and one-sided deletion. More edge-case regression coverage
and Next.js verification remain. Sending a message does not yet emit a NestJS
realtime event.

**Complete when:** All chat REST operations pass their NestJS tests and work
through the Next.js UI.

## Phase 7: Replace realtime chat

- [ ] Implement authenticated WebSocket connections and private per-user
      message delivery in NestJS.
- [ ] Preserve authorization so users can only subscribe to their own
      user-specific channel.
- [ ] Decide on the NestJS transport and frontend client together. Laravel
      Echo/Reverb and a typical NestJS Socket.IO gateway may use different
      protocols and are not automatically interchangeable.
- [ ] Update the Next.js realtime client and environment variables if required.
- [ ] Verify delivery between two authenticated browser sessions, reconnect
      behavior, and access denial for unauthorized subscriptions.

**Complete when:** Messages sent through NestJS appear in the other
participant's UI in real time, without exposing events to unauthorized users.

## Phase 8: Verify and switch over

- [ ] Run the NestJS unit and e2e tests, then compare each route against the
      Phase 1 behavior checklist.
- [ ] Test the full frontend flows against NestJS: registration, login/logout,
      user search, blocking, message history, sending, deletion, and live
      delivery.
- [ ] Test CORS, cookies, CSRF, HTTPS settings, environment configuration, and
      deployment health checks in a staging environment.
- [ ] Switch frontend API configuration and production traffic to NestJS only
      after staging verification.
- [ ] Keep a rollback path to Laravel during the initial rollout; monitor errors
      and database behavior after switching.
- [ ] Retire Laravel, Fortify/Sanctum, and Reverb only after NestJS is stable
      and backups and rollback requirements are satisfied.

**Complete when:** Production traffic uses NestJS, application behavior is
verified, and the rollback window has passed successfully.

## Suggested first milestone

Complete Phases 1–3: document the current behavior, create a healthy NestJS
service, and verify it can connect to PostgreSQL without changing the frontend
or production behavior. Then migrate authentication before moving on to chat.
