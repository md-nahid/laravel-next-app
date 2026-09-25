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

## 7. Complete message flow

The following is the exact chain for one message. Each step is triggered by the
step immediately before it.

### 1. Sender submits the message

Reference: `next-app/src/app/(app)/dashboard/[id]/_blocks/chat-form.tsx`

The sender submits the chat form. The form calls the mutation with the
recipient ID from the URL:

```tsx
onSubmit: ({ value }) => {
	mutate(value)
}
```

The mutation is configured in `next-app/src/_api/client.ts`:

```ts
send: mutationBuilder<MutationResponse, APIError, unknown>(
	_queryKeys.conversations
)
```

This creates a `POST /api/conversations/{receiverId}` request.

### 2. Laravel validates and stores the message

Reference: `example-app/app/Http/Controllers/ConversationController.php`,
method `store`.

Laravel validates the `message` field and creates the `Conversation` record:

```php
$conversation = Conversation::create([
		'sender_id' => $request->user()->id,
		'receiver_id' => $receiverId,
		'message' => $validatedData['message'],
]);
```

Only after the database record exists does Laravel trigger the broadcast event:

```php
MessageSent::dispatch($conversation);
```

### 3. Laravel places the broadcast on the queue

Reference: `example-app/app/Events/MessageSent.php`.

`MessageSent` implements `ShouldBroadcast`, so dispatching the event creates a
queued broadcast job instead of sending the WebSocket message during the API
request:

```php
class MessageSent implements ShouldBroadcast
```

The `queue` Docker service runs `php artisan queue:work`. When it receives the
job, Laravel calls `broadcastOn` and `broadcastWith` on `MessageSent`.

### 4. Laravel selects the recipient's private channel

Reference: `example-app/app/Events/MessageSent.php`, method `broadcastOn`.

The event is sent only to the recipient's channel. For recipient ID `14`, the
channel name becomes `private-users.14`:

```php
return [
		new PrivateChannel('users.'.$this->conversation->receiver_id),
];
```

The public channel name is `users.{userId}`. Echo adds the `private-` prefix
when it subscribes.

### 5. Laravel authorizes the private subscription

References: `example-app/routes/channels.php` and
`next-app/src/lib/echo.ts`.

Before receiving private events, Echo sends `POST /broadcasting/auth`. Laravel
executes the channel callback and allows the subscription only when the logged
in user owns the channel:

```php
Broadcast::channel('users.{userId}', function (User $user, int $userId): bool {
		return $user->id === $userId;
});
```

The browser sends the authenticated Sanctum cookies through the custom Echo
authorizer in `src/lib/echo.ts`. A successful response contains an `auth`
signature, which Echo uses to subscribe to the private channel.

### 6. Reverb publishes the event over WebSocket

Reference: `example-app/compose.yaml`, service `reverb`.

The Reverb service listens inside Docker on `0.0.0.0:8080` and is published to
the browser as `localhost:8080`. The backend containers use the Docker hostname
`reverb` when sending broadcasts; the browser uses `localhost`.

`broadcastAs` names the event received by Echo:

```php
public function broadcastAs(): string
{
		return 'message.sent';
}
```

### 7. Recipient Echo listener receives the event

Reference: `next-app/src/app/(app)/dashboard/[id]/_blocks/chat-conversations.tsx`.

When the chat component mounts, it subscribes to the current user's private
channel and listens for `.message.sent`:

```tsx
activeEcho
	.private(channelName)
	.listen(".message.sent", (conversation: Conversation) => {
		queryClient.invalidateQueries({
			queryKey: apiQuery.chat.getConversation.key(),
		})
	})
```

The leading dot is required because the backend uses a custom broadcast name
through `broadcastAs`.

### 8. TanStack Query refreshes the visible conversation

Invalidating the conversation query triggers the existing
`GET /api/conversations/{conversationPartnerId}` request. The refreshed data is
then rendered by `ChatConversations`, so the recipient sees the new message
without manually refreshing the page.

The sender separately invalidates the same query in `chat-form.tsx` after the
`POST` request succeeds. This prevents the sender from waiting for a broadcast
that is intentionally delivered only to the recipient.

## Production notes

Use HTTPS and secure WebSockets in production. Replace the local Reverb credentials and host with production values, set `REVERB_SCHEME=https`, and configure the production domain in `FRONTEND_URL` and `SANCTUM_STATEFUL_DOMAINS`. Reverb and a queue worker must remain running in production.
