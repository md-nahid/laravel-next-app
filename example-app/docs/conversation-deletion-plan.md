# Conversation Deletion Implementation Plan

## Goal

Let an authenticated user delete their view of a conversation without deleting
messages from the other participant's history. The deleted user's old messages
stay hidden if they open the thread again; messages sent or received after the
deletion appear as a fresh conversation.

A conversation is currently represented by its individual `conversations`
rows, rather than by a separate thread record. Record a per-user, per-partner
message-ID cutoff instead of deleting message rows. This keeps deletion
directional and preserves the other participant's history.

## Step 1: Add a per-user conversation deletion table

**Description:** Persist the last message that should be hidden for each
user/partner pair. Keep one row per pair, cascade it when either user is
deleted, and index the pair lookup.

**File:** `example-app/database/migrations/2026_10_10_000000_create_conversation_deletions_table.php` (new file; use an available migration timestamp)

**Location:** Migration `up()` and `down()` methods.

**Code:**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_deletions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('partner_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('deleted_through_message_id')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'partner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_deletions');
    }
};
```

**Explanation:** `user_id` is the person who deleted the thread, and
`partner_id` is the other participant. `deleted_through_message_id` stores the
highest existing message ID in either direction at deletion time. A nullable
cutoff supports deleting a thread that has no messages yet.

## Step 2: Add an authenticated delete endpoint

**Description:** Add an idempotent endpoint that advances the signed-in user's
cutoff for the selected partner. Do not accept the deleting user's ID or the
cutoff from the request body.

**File:** `example-app/routes/api.php`

**Location:** Add the DELETE route inside the existing `auth:sanctum` group,
next to the conversation routes.

**Code:**

```php
Route::delete('/conversations/{conversationPartnerId}', [ConversationController::class, 'destroy']);
```

**Explanation:** The route uses the same authenticated conversation API. The
controller derives the user from `$request->user()` and finds the cutoff on the
server.

**File:** `example-app/app/Http/Controllers/ConversationController.php`

**Location:** Add the `DB` facade import and a `destroy()` method.

**Code:**

```php
use Illuminate\Support\Facades\DB;
```

```php
public function destroy(Request $request, int $conversationPartnerId): JsonResponse
{
    $user = $request->user();
    $partner = User::query()->findOrFail($conversationPartnerId);

    abort_if($partner->is($user), 422, 'You cannot delete a conversation with yourself.');

    $latestMessageId = Conversation::query()
        ->where(function ($query) use ($user, $partner): void {
            $query->where('sender_id', $user->id)
                ->where('receiver_id', $partner->id);
            $query->orWhere(function ($query) use ($user, $partner): void {
                $query->where('sender_id', $partner->id)
                    ->where('receiver_id', $user->id);
            });
        })
        ->max('id');

    DB::table('conversation_deletions')->updateOrInsert(
        [
            'user_id' => $user->id,
            'partner_id' => $partner->id,
        ],
        [
            'deleted_through_message_id' => $latestMessageId,
            'updated_at' => now(),
            'created_at' => now(),
        ],
    );

    return response()->json(['message' => 'Conversation deleted.']);
}
```

**Explanation:** The maximum ID is taken across messages in both directions.
`updateOrInsert()` creates or advances this user's marker on repeat deletions.
It does not delete conversation rows, dispatch a message event, or change the
partner's view. If there are no existing messages, the null cutoff leaves later
messages visible.

## Step 3: Hide messages through the cutoff when fetching a conversation

**Description:** Apply the signed-in user's marker to the existing conversation
query before pagination. Leave requests by the other participant unaffected.

**File:** `example-app/app/Http/Controllers/ConversationController.php`

**Location:** In `between()`, after getting the authenticated user ID and before
calling `paginate()`.

**Code:**

```php
$deletedThroughMessageId = DB::table('conversation_deletions')
    ->where('user_id', $authenticatedUserId)
    ->where('partner_id', $conversationPartnerId)
    ->value('deleted_through_message_id');

$conversations = Conversation::query()
    ->with(['sender', 'receiver'])
    ->where(function ($query) use ($authenticatedUserId, $conversationPartnerId): void {
        $query->where('sender_id', $authenticatedUserId)
            ->where('receiver_id', $conversationPartnerId);
        $query->orWhere(function ($query) use ($authenticatedUserId, $conversationPartnerId): void {
            $query->where('sender_id', $conversationPartnerId)
                ->where('receiver_id', $authenticatedUserId);
        });
    })
    ->when(
        $deletedThroughMessageId !== null,
        fn ($query) => $query->where('id', '>', $deletedThroughMessageId),
    )
    ->latest()
    ->paginate($validatedData['per_page'] ?? 100);
```

**Explanation:** Message IDs are unique and increasing, so messages persisted
after the saved cutoff have greater IDs. Applying the cutoff before pagination
keeps the existing response format and ordering while making the thread appear
empty until a new message is stored.

## Step 4: Test per-user deletion and fresh-thread behavior

**Description:** Cover the delete endpoint, the filtered fetch response, and
message visibility for both participants. Keep message rows intact.

**File:** `example-app/tests/Feature/Chat/ConversationDeletionTest.php` (new file)

**Location:** Add feature tests in a `Tests\Feature\Chat\ConversationDeletionTest`
class using `RefreshDatabase`.

**Code:** Include tests for these cases:

```php
public function test_user_can_delete_their_view_without_deleting_the_partners_history(): void
public function test_new_messages_after_deletion_are_visible_without_old_history(): void
public function test_repeated_deletion_advances_the_cutoff(): void
public function test_guest_cannot_delete_a_conversation(): void
public function test_deletion_requires_an_existing_other_user(): void
public function test_user_cannot_delete_a_conversation_with_themself(): void
public function test_deleting_a_conversation_with_no_messages_succeeds(): void
```

**Explanation:** Create messages in both directions before deletion. Verify
they remain in the database and are hidden only from the deleting user's
`GET /api/conversations/{conversationPartnerId}` response. Then create new
messages in both directions and verify only those appear in the deleting user's
response, while the partner still sees the full history. Repeating deletion
after new messages should hide those messages for the deleting user too.

## Step 5: Add the frontend delete mutation

**Description:** Expose the DELETE endpoint through the existing mutation
builder and mutation factory rather than adding a new HTTP helper.

**File:** `next-app/src/_api/client.ts`

**Location:** Add `mutationBuilderDelete` to the existing import from
`./mutation-factory`, then add a delete mutation under `apiMutation.chat`.

**Code:**

```ts
import {
  mutationBuilder,
  mutationBuilderDelete,
} from "./mutation-factory"
```

```ts
chat: {
  send: mutationBuilder<MutationResponse, APIError, unknown>(
    _queryKeys.conversations
  ),
  delete: mutationBuilderDelete<MutationResponse, APIError>(
    _queryKeys.conversations
  ),
},
```

**Explanation:** The existing delete builder appends the conversation partner
ID and sends `DELETE /conversations/{partnerId}`. The current authenticated
user remains determined by Sanctum.

## Step 6: Connect the chat-header Delete action

**Description:** Replace the placeholder menu item with a confirmed delete
action. On success, refresh the active conversation and show feedback. Keep the
user on the chat page so they can continue the conversation.

**File:** `next-app/src/app/(app)/dashboard/[id]/_blocks/chat-header.tsx`

**Location:** Add a delete mutation using `useMutation`, `apiMutation.chat.delete`,
and the existing conversation query key. Connect it to the current Delete menu
item. Use the existing `AlertDialog` components for confirmation.

**Code:**

```tsx
const { mutate: deleteConversation, isPending: isDeleting } = useMutation(
  apiMutation.chat.delete.mutation({
    param: id,
    onSuccess: (response) => {
      toast.success(response.message)
      queryClient.invalidateQueries({
        queryKey: apiQuery.chat.getConversation.key(id),
      })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message ?? "Unable to delete conversation.")
    },
  })
)
```

Replace the placeholder item with a trigger for the confirmation dialog. The
dialog should identify the conversation as being deleted only from the current
user's view and disable its confirmation action while `isDeleting` is true.
Confirming calls `deleteConversation()`.

**Explanation:** Invalidation refetches the open thread using the backend's
per-user cutoff. Do not navigate away or remove the selected user; subsequent
messages should remain usable and appear as a fresh thread.

## Step 7: Document conversation deletion

**Description:** Document the endpoint, its directional behavior, and how the
cutoff affects messages in the existing chat documentation.

**File:** `example-app/docs/realtime-chat.md`

**Location:** Append a `Conversation deletion` section after the existing
message-flow documentation.

**Code:**

```markdown
## Conversation deletion

`DELETE /api/conversations/{conversationPartnerId}` hides the conversation's
existing messages from the authenticated user. It does not delete message rows
or change the other participant's history. Laravel records a per-user cutoff at
the highest existing message ID for the pair.

The existing `GET /api/conversations/{conversationPartnerId}` endpoint omits
messages through that cutoff. Messages stored after deletion are visible to the
user as a fresh conversation; the old messages remain hidden. The endpoint
requires authentication.
```

**Explanation:** Keep the API contract and user-visible behavior clear for
developers maintaining the chat flow.

## Step 8: Verify the changes

**Description:** Run the focused backend feature test, then the existing
frontend typecheck and lint scripts.

**File:** `example-app/tests/Feature/Chat/ConversationDeletionTest.php`

**Location:** The conversation deletion feature tests.

**Code:** Run from `example-app`:

```bash
php artisan test --compact tests/Feature/Chat/ConversationDeletionTest.php
```

**Explanation:** Verifies deletion authorization, cutoff behavior, and
per-participant message visibility.

**File:** `next-app/package.json`

**Location:** Existing `typecheck` and `lint` scripts.

**Code:** Run from `next-app`:

```bash
bun run typecheck
bun run lint
```

**Explanation:** Verifies the mutation typing and chat-header confirmation
action.
