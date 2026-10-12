# NestJS Realtime Chat Plan

## Goal

Add realtime message notifications to the standalone NestJS API and connect the
Next.js chat UI to them. A message must still be validated and persisted by the
existing REST API before it can be announced. Conversation history, pagination,
block behavior, and one-sided history deletion remain database/API concerns;
the realtime transport only tells connected clients that their conversation
may have changed.

## Current state

- `POST /api/conversations/:receiverId` stores a message in PostgreSQL and
  returns the saved message.
- `GET /api/conversations/:partnerId` returns paginated message history.
- `ConversationsService.sendMessage` rejects self-messages, missing recipients,
  and messages from a user blocked by the recipient.
- Session-cookie and bearer-token authentication are implemented for HTTP.
- The Next.js conversation view currently refetches history every five seconds.
- NestJS does not currently have a WebSocket gateway or a WebSocket client
  dependency.
- Laravel Reverb is a separate application/service; NestJS must not depend on
  Laravel's database, session store, Reverb credentials, or queue worker.

## Proposed design

Use a NestJS Socket.IO gateway for browser realtime connections. Add the Nest
WebSocket/Socket.IO server dependencies to `nest-app` and `socket.io-client` to
`next-app`. Keep the existing HTTP endpoints as the source of truth and retain
the current API response shapes.

After the database insert succeeds, publish a small `message.created` event to
the recipient's authenticated personal room (`user:{userId}`). The room
membership is assigned by the server after authentication; clients must never
be able to request arbitrary user or conversation rooms. The event should
contain only the saved message fields needed to identify/update the
conversation (at minimum its ID, sender ID, receiver ID, and creation time).
The client uses the event to invalidate the matching conversation query and
fetches the canonical message from `GET /api/conversations/:partnerId`.

The sender continues to refresh from the successful REST mutation response.
Delivering to the recipient only matches the existing Laravel behavior and
avoids making transport delivery a requirement for the sender's UI.

### Authentication and connection policy

- Authenticate at the Socket.IO handshake using the same configured CORS
  origins as HTTP.
- Support the existing browser session cookie and bearer tokens. For bearer
  authentication, send the token in Socket.IO's `auth` handshake payload, not a
  URL or query parameter.
- Reuse the existing session and token verification rules where practical;
  factor shared identity resolution rather than duplicating token/session
  verification in the gateway.
- Reject unauthenticated or expired credentials and do not join a room until
  the user identity is verified.
- On disconnect, Socket.IO removes room membership. On reconnect, authenticate
  again and refresh the currently open conversation to recover missed events.
- Treat events as notifications, not a durable delivery queue. A database
  outbox or distributed Socket.IO adapter is out of scope until delivery or
  multi-instance requirements call for it.

## Implementation plan

### 1. Add the gateway and authentication

- Add the WebSocket gateway in a focused realtime module or alongside the
  conversations feature, following existing Nest module boundaries.
- Configure Socket.IO CORS from `CORS_ORIGINS` and allow credentialed
  connections for session-cookie clients.
- Implement handshake authentication for session cookies and bearer tokens.
  Share or extract identity-resolution logic from the HTTP auth flow as needed.
- Join each authenticated connection only to `user:{authenticatedUserId}`.
- Cover missing, malformed, expired, and valid credentials; verify a client
  cannot subscribe to another user's room.

### 2. Publish persisted messages

- Inject a small publisher/event boundary into the conversation flow.
- Publish only after `ConversationsService.sendMessage` has inserted and
  returned the saved row. Never emit before persistence or emit an untrusted
  request body as if it were a saved message.
- Send `message.created` to the recipient's personal room. Keep the payload
  minimal and consistent in naming with existing API response conventions.
- Preserve existing `403`, `404`, and `422` behavior for block, missing-user,
  and self-message cases; rejected messages emit no event.
- If publication fails after insertion, surface/log the transport failure
  without reporting the message insert itself as failed. The REST response
  remains successful because the message is already persisted; the recipient
  can recover by fetching history or reconnecting.

### 3. Connect the Next.js chat

- Add a shared Socket.IO client lifecycle that connects only for an
  authenticated user and disconnects on logout/account change.
- Send the session cookie through the credentialed browser handshake or send
  the existing bearer token through the handshake `auth` payload, matching the
  app's active auth mode.
- Listen for `message.created`, validate the event's relevant IDs, and
  invalidate the active conversation query only when the current user is the
  receiver and the other participant matches the open conversation.
- Keep invalidation after a successful send so the sender sees the canonical
  saved response immediately.
- Remove the five-second polling only after realtime reconnect and missed-event
  recovery are implemented and tested. Retain a user-initiated refresh path.

### 4. Configuration and operations

- Document the WebSocket URL/origin alongside the existing Nest and Next
  environment configuration; keep secrets and bearer tokens out of URLs and
  logs.
- Keep local Nest Postgres and Laravel/Reverb services independent.
- Use HTTPS/WSS in deployed environments and explicitly configure allowed
  frontend origins.
- Start with the in-memory Socket.IO adapter for a single Nest instance. If
  Nest is later horizontally scaled, add a shared adapter (for example Redis)
  and deployment-specific connection/load-balancer configuration.

## Testing plan

### NestJS automated tests

- Gateway unit tests: authentication, room membership, rejected identities,
  payload shape, and disconnect behavior.
- Conversation-service integration tests: an accepted message is persisted
  before publishing; only the recipient is targeted; self-messages, missing
  recipients, and blocked senders do not publish.
- WebSocket e2e tests using the configured test database: authenticated
  recipient receives an event; unrelated and unauthenticated clients do not;
  invalid/expired credentials cannot connect.
- Keep existing REST e2e tests passing and assert that HTTP message/history
  response shapes are unchanged.
- Test publication failure separately to ensure the already-persisted message
  still returns success and the failure is observable in server logs.

### Next.js verification

- Test the authenticated connection lifecycle, account switch/logout cleanup,
  matching-conversation invalidation, and ignored unrelated events.
- Manually open the same conversation in two accounts: send from one, verify
  the other updates without waiting for polling, then disconnect/reconnect and
  verify history refresh catches up.
- Verify the sender still sees a sent message immediately and that blocking or
  deleting a conversation retains current behavior.

## Acceptance criteria

- A persisted message to an online recipient triggers one `message.created`
  notification to that recipient's private user room.
- Unauthorized clients cannot join or observe another user's room or message
  events.
- Existing REST authentication, message validation, block rules, pagination,
  deletion semantics, and response shapes remain unchanged.
- The Next.js recipient sees new messages without a page refresh or periodic
  five-second polling.
- Reconnecting clients refresh history and recover messages sent while they
  were offline.
- The implementation and setup do not require Laravel or Reverb to be running.

## Non-goals

- Replacing REST message creation or history with WebSocket commands.
- Presence, typing indicators, read receipts, delivery guarantees, or
  multi-device sender fan-out.
- Migrating Laravel chat data or sharing Laravel sessions between applications.
- Adding a queue, Redis, or a durable event outbox before there is a deployment
  requirement for them.
