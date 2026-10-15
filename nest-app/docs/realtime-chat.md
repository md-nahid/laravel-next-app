# NestJS Realtime Chat Implementation Guide

> Implementation status: the NestJS gateway, session authentication,
> recipient notification, Next.js client hook, and PostgreSQL-backed socket
> integration checks are implemented. This guide records the design and
> verification points.

## Outcome

When user A sends a message using the existing REST endpoint, NestJS saves it
to PostgreSQL and notifies connected user B over Socket.IO. B's Next.js chat
then refetches the existing conversation endpoint. REST remains responsible for
creating messages and loading history; the socket only announces that saved
history changed.

This implementation is for one NestJS instance, one-to-one conversations, and
the existing session-cookie login. It does not use Laravel, Reverb, a queue, or
a second message store.

## Existing code to preserve

- `nest-app/src/conversations/conversations.controller.ts` exposes
  `POST /api/conversations/:receiverId`.
- `nest-app/src/conversations/conversations.service.ts` validates the
  recipient/block rules and inserts the message. Publish only after that
  insert succeeds; do not change the REST response shape.
- `nest-app/src/auth/auth.guards.ts` authenticates HTTP requests using the
  Nest session cookie or bearer token.
- `nest-app/src/auth/session.service.ts` validates the session cookie.
- `nest-app/src/main.ts` already configures credentialed HTTP CORS from
  `CORS_ORIGINS`.
- `next-app/src/_api/api.ts` already configures credentialed Axios requests.
- `next-app/src/app/(app)/dashboard/[id]/_blocks/chat-conversations.tsx`
  currently polls conversation history every five seconds.
- `next-app/src/app/(app)/dashboard/[id]/_blocks/chat-form.tsx` refreshes
  history after the sender's REST request succeeds.

## Event contract

Use one Socket.IO event called `message.created`. The server sends it to the
recipient's personal room only. It is a notification, not the message source
of truth:

```ts
export type MessageCreatedEvent = {
  id: number;
  sender_id: number;
  receiver_id: number;
  created_at: string;
};
```

Do not include the message body. On receipt, the client invalidates the
conversation query and reads the canonical, authorized response from
`GET /api/conversations/:partnerId`.

## Files to change and add

| App | File | Change |
| --- | --- | --- |
| Nest | `package.json` / `bun.lock` | Add the Socket.IO server dependencies. |
| Nest | `src/auth/auth.service.ts` | Expose shared identity resolution for HTTP guards and WebSocket handshakes. |
| Nest | `src/auth/auth.guards.ts` | Reuse the shared identity resolver; keep HTTP behavior unchanged. |
| Nest | `src/auth/auth.module.ts` | Export the identity service for the realtime module. |
| Nest | `src/realtime/realtime.gateway.ts` | Authenticate sockets, join private user rooms, and publish message notifications. |
| Nest | `src/realtime/realtime.module.ts` | Register and export the gateway. |
| Nest | `src/conversations/conversations.module.ts` | Import the realtime module. |
| Nest | `src/conversations/conversations.service.ts` | Notify the recipient after a successful message insert. |
| Nest | `test/api.integration.e2e-spec.ts` | Test socket authentication and recipient-only message delivery with the existing API integration flow. |
| Next | `package.json` / `bun.lock` | Add the Socket.IO client dependency. |
| Next | `src/_api/types.ts` | Define the event payload type. |
| Next | `src/lib/use-chat-realtime.ts` | Own one authenticated socket for the open chat and invalidate history. |
| Next | `src/app/(app)/dashboard/[id]/_blocks/chat-conversations.tsx` | Connect the hook and remove five-second polling. |
| Next | `src/app/(app)/dashboard/[id]/_blocks/chat-form.tsx` | Invalidate only the conversation just sent to. |
| Docs | `nest-app/README.md` and `next-app/README.md` | Document the local and deployed WebSocket URL/origin. |

## Implementation sequence

### 1. Install Socket.IO

From `nest-app/`:

```bash
bun add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

From `next-app/`:

```bash
bun add socket.io-client
```

Commit the updated manifests and lockfiles with the implementation. No Redis or
other adapter is needed for a single NestJS process.

### 2. Share HTTP and WebSocket authentication

Do not duplicate the token hash, token expiry, or session expiry checks in the
gateway. Extract the current checks in `AuthGuard` into a method on the
existing `AuthService`, for example:

```ts
type AuthIdentity = {
  user: User;
  authType: 'session' | 'token';
  authSession?: AuthenticatedRequest['authSession'];
};

class AuthService {
  async resolveIdentity(
    request: Pick<AuthenticatedRequest, 'headers'>,
  ): Promise<AuthIdentity | null> {
    // Move the existing AuthGuard token lookup here.
    // Otherwise validate the cookie with SessionService.fromRequest,
    // then load and return the session's user.
    // Return null when credentials are missing, invalid, or expired.
  }
}
```

Adapt the code to the existing types and imports rather than copying the
placeholder body verbatim. The resolver must preserve all existing checks:

- Personal access credentials are parsed as `<id>|<secret>`; only the
  SHA-256 hash of the secret is looked up, and expired credentials are
  rejected.
- Cookie sessions are validated with `SessionService.fromRequest`; sessions
  without a user or past their lifetime are rejected.
- Successful bearer authentication continues updating `lastUsedAt`, as the
  current HTTP guard does.

Change `AuthGuard` to call this resolver and set `request.user`,
`request.authType`, and `request.authSession` from the result. Keep
`CsrfGuard` and all HTTP endpoint behavior unchanged. Export `AuthService`
from `AuthModule` so the realtime module can use the same resolver.

### 3. Create the authenticated gateway

Add `src/realtime/realtime.gateway.ts` and `src/realtime/realtime.module.ts`.
The gateway must authenticate each new connection before joining any room:

```ts
@WebSocketGateway({
  cors: {
    origin: allowedFrontendOrigins,
    credentials: true,
  },
  allowRequest: (request, callback) => {
    const origin = request.headers.origin;
    callback(
      null,
      typeof origin === 'string' && allowedFrontendOrigins.includes(origin),
    );
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly auth: AuthService) {}

  async handleConnection(client: Socket) {
    const identity = await this.auth.resolveIdentity(client.request);
    if (!identity) {
      client.disconnect(true);
      return;
    }

    client.data.userId = identity.user.id;
    await client.join(`user:${identity.user.id}`);
  }

  notifyMessageCreated(event: MessageCreatedEvent) {
    this.server
      .to(`user:${event.receiver_id}`)
      .emit('message.created', event);
  }
}
```

Import the matching Socket.IO/Nest types and supply `allowedFrontendOrigins`
from the same exact-origin `CORS_ORIGINS` setting as HTTP. Do not use
`origin: '*'` with credentials. `allowRequest` checks browser WebSocket
upgrades too; HTTP CORS alone does not validate a WebSocket connection. If
Nest's gateway metadata type does not accept `allowRequest`, configure this
same callback through the Socket.IO adapter in `main.ts` instead.

The browser automatically includes eligible cookies in a credentialed
Socket.IO handshake. The client must not provide a user ID, room name, session
ID, or token in a URL. If bearer-token socket support is needed, accept the
token through Socket.IO's `auth` payload and pass it to the shared identity
resolver without logging it. The current frontend uses session cookies.

`RealtimeModule` imports `AuthModule`, provides `RealtimeGateway`, and exports
it. `ConversationsModule` imports `RealtimeModule` so the conversation service
can use the gateway. Do not add a client event that lets a socket join an
arbitrary room.

### 4. Publish only saved messages

In `ConversationsService.sendMessage`, call the gateway after the database
insert has returned its row. Use the IDs from the persisted row and the
timestamp returned from PostgreSQL:

```ts
const event: MessageCreatedEvent = {
  id: conversation.id,
  sender_id: conversation.senderId,
  receiver_id: conversation.receiverId,
  created_at: (conversation.createdAt ?? now).toISOString(),
};

this.realtime.notifyMessageCreated(event);
```

Inject `RealtimeGateway` through the constructor. Keep the current REST return
object unchanged. If the insert fails, do not emit. If publication throws
after persistence, log the failure with a Nest `Logger` and still return the
saved message; returning an HTTP failure after saving would cause the sender
to retry and potentially create a duplicate. Do not catch database errors or
hide failures unrelated to socket publication.

Preserve the current rules: missing recipient remains `404`, self-message
remains `422`, and a recipient who blocked the sender remains `403`. None of
these rejected sends should emit an event.

### 5. Add the Next.js socket hook

Add `MessageCreatedEvent` to `next-app/src/_api/types.ts`. Add
`src/lib/use-chat-realtime.ts` with a hook that takes the authenticated user's
ID and the open partner ID. The hook should:

1. Do nothing until the existing `apiQuery.me.query()` has returned a user.
2. Connect to the origin of `NEXT_PUBLIC_REST_API_ENDPOINT` with
   `withCredentials: true` and `autoConnect: false`.
3. Listen for `connect` and invalidate the open chat query. This also reloads
   messages missed while disconnected.
4. Listen for `message.created`; ignore malformed events, events where
   `receiver_id` is not the signed-in user, and events whose sender is not the
   open partner.
5. Invalidate
   `apiQuery.chat.getConversation.key(partnerId)` for a matching event.
6. Remove listeners and disconnect when the chat unmounts or the user/partner
   changes.

Use this as the complete hook structure; add the imports shown and keep the
conversation query key's partner parameter a string, matching the existing
`id` prop:

```ts
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { apiQuery } from "@/_api/client";
import type { MessageCreatedEvent } from "@/_api/types";

const apiUrl = process.env.NEXT_PUBLIC_REST_API_ENDPOINT;

export function useChatRealtime({
  currentUserId,
  partnerId,
}: {
  currentUserId?: number;
  partnerId: string;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const numericPartnerId = Number(partnerId);
    if (
      currentUserId === undefined ||
      !Number.isSafeInteger(numericPartnerId) ||
      numericPartnerId <= 0
    ) {
      return;
    }

    const refreshConversation = () =>
      queryClient.invalidateQueries({
        queryKey: apiQuery.chat.getConversation.key(partnerId),
      });
    const socket = io(new URL(apiUrl).origin, {
      autoConnect: false,
      withCredentials: true,
    });
    const onMessageCreated = (event: MessageCreatedEvent) => {
      if (
        !Number.isSafeInteger(event.id) ||
        !Number.isSafeInteger(event.sender_id) ||
        !Number.isSafeInteger(event.receiver_id)
      ) {
        return;
      }
      if (
        event.receiver_id === currentUserId &&
        event.sender_id === numericPartnerId
      ) {
        void refreshConversation();
      }
    };

    socket.on("connect", refreshConversation);
    socket.on("message.created", onMessageCreated);
    socket.connect();

    return () => {
      socket.off("connect", refreshConversation);
      socket.off("message.created", onMessageCreated);
      socket.disconnect();
    };
  }, [currentUserId, partnerId, queryClient]);
}
```

### 6. Wire the hook into the chat and remove polling

In `chat-conversations.tsx`:

- Import `useQuery`, `apiQuery`, and the new realtime hook.
- Read the signed-in user with `useQuery(apiQuery.me.query())`.
- Call the hook with `user?.id` and `Number(id)`.
- Remove `refetchInterval: 5_000`. Keep `staleTime: 0` and the existing
  infinite-query pagination.

Example integration:

```tsx
const { data: user } = useQuery(apiQuery.me.query());
useChatRealtime({ currentUserId: user?.id, partnerId: Number(id) });

const conversationQuery = useInfiniteQuery(
  apiQuery.chat.getConversation.query({
    param: id,
    enabled: Boolean(user && id),
    staleTime: 0,
  }),
);
```

The first history query runs as before. A successful socket connection
invalidates it once, and a reconnect invalidates it again. This is how the
client catches up after an offline period; Socket.IO itself is not a durable
message queue.

In `chat-form.tsx`, keep the successful-send invalidation, but scope it to
`apiQuery.chat.getConversation.key(id)` rather than invalidating every
conversation. This preserves immediate sender updates while the event is sent
only to the recipient.

### 7. Configure and run locally

The client derives the socket origin from the existing API endpoint:

```env
NEXT_PUBLIC_REST_API_ENDPOINT=http://localhost:3001/api
```

Keep the Nest `.env` origin allowlist aligned with the browser URL:

```env
CORS_ORIGINS=http://localhost:3000
```

Start PostgreSQL and Nest in `nest-app/`, then the frontend in `next-app/`.
Both services must remain running. In production use HTTPS/WSS, exact
frontend origins, and cookies configured for the frontend/API domain
relationship. Since the frontend calls Nest directly, browser cookie policy
applies; frontend and API should be same-site (for example,
`app.example.com` and `api.example.com`) for session-cookie authentication.

## Tests to implement

### NestJS

Socket integration coverage lives in `test/api.integration.e2e-spec.ts`. Keep
these assertions when extending it:

- A valid session cookie connects and joins only `user:<authenticated id>`.
- Missing, expired, and invalid session credentials are disconnected.
- A client cannot choose another user's room; there is no client-controlled
  join-room event.
- A successful REST message insert emits exactly one `message.created` event
  to the receiver and none to an unrelated user.
- Self-message, missing-recipient, blocked-recipient, and database-insert
  failures emit no event.
- Socket publication failure does not change the successful REST response
  after the message row has been saved.
- Existing HTTP response shapes and API integration tests remain unchanged.

### Next.js

Verify:

- A signed-in recipient sees a new message without five-second polling.
- An event from another conversation does not invalidate the active query.
- The sender sees the message after the REST mutation succeeds.
- Disconnect/reconnect causes history to refresh and includes messages sent
  while offline.
- Navigating away or changing accounts disconnects the old socket.

## Completion checklist

- [ ] Install dependencies and commit both lockfile updates.
- [ ] Extract and reuse HTTP identity validation for Socket.IO.
- [ ] Authenticate the handshake before joining the server-assigned user room.
- [ ] Emit `message.created` only after the saved row exists.
- [ ] Add focused NestJS and Next.js tests.
- [ ] Wire the hook into `chat-conversations.tsx` and remove polling.
- [ ] Update setup docs and verify the two-account manual flow.

## Not included in this first implementation

- Replacing REST message creation or history loading with socket commands.
- Presence, typing indicators, read receipts, or durable offline delivery.
- Redis, a queue, a transactional outbox, or horizontal scaling.
- Importing Laravel messages, accounts, sessions, or Reverb configuration.
