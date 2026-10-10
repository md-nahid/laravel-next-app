# User Blocking Implementation Plan

## Goal

If user A blocks user B, B cannot send new messages to A. Enforce this in Laravel before a message is stored or broadcast. Keep historical messages unchanged.

Blocking is directional in this plan: a blocked user cannot send to the blocker. The blocker can still send to the blocked user. Do not treat `is_blocked_by_me` as information about whether the other user blocked the current user.

## Step 1: Add the block relationship table

**Description:** Store one directional relationship per blocker/blocked-user pair. Cascade rows when either user is deleted, prevent duplicates, and index lookups by blocked user.

**File:** `example-app/database/migrations/2026_09_27_160000_create_user_blocks_table.php` (new file)

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
        Schema::create('user_blocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('blocker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('blocked_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['blocker_id', 'blocked_id']);
            $table->index('blocked_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_blocks');
    }
};
```

**Explanation:** `blocker_id` is the user who initiated the block. `blocked_id` is the target. The column directions are used consistently in the model, API, and send authorization check.

## Step 2: Add directional user relationships

**Description:** Represent both directions with Eloquent many-to-many relationships; a separate pivot model is not needed.

**File:** `example-app/app/Models/User.php`

**Location:** Add the `BelongsToMany` import and methods near the existing `conversationsSent()` / `conversationsReceived()` relationships.

**Code:**

```php
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
```

```php
public function blockedUsers(): BelongsToMany
{
    return $this->belongsToMany(User::class, 'user_blocks', 'blocker_id', 'blocked_id')
        ->withTimestamps();
}

public function blockedByUsers(): BelongsToMany
{
    return $this->belongsToMany(User::class, 'user_blocks', 'blocked_id', 'blocker_id')
        ->withTimestamps();
}
```

**Explanation:** `$user->blockedUsers()` means users blocked by `$user`; `$user->blockedByUsers()` means users who blocked `$user`. Use the explicit relationship matching the direction being checked.

## Step 3: Add authenticated block and unblock endpoints

**Description:** Let the signed-in user create or remove their own block relationship. Make both actions safe to repeat; never accept the blocker ID from the request body.

**File:** `example-app/app/Http/Controllers/Api/UserBlockController.php` (new file)

**Location:** Add the controller with `store()` and `destroy()` actions.

**Code:**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserBlockController extends Controller
{
    public function store(Request $request, int $userId): JsonResponse
    {
        $target = User::query()->findOrFail($userId);

        abort_if($target->is($request->user()), 422, 'You cannot block yourself.');

        $request->user()->blockedUsers()->syncWithoutDetaching([$target->getKey()]);

        return response()->json(['message' => 'User blocked.']);
    }

    public function destroy(Request $request, int $userId): JsonResponse
    {
        $target = User::query()->findOrFail($userId);

        $request->user()->blockedUsers()->detach($target->getKey());

        return response()->json(['message' => 'User unblocked.']);
    }
}
```

**Explanation:** `syncWithoutDetaching()` makes repeated block requests idempotent. `detach()` makes repeated unblock requests harmless. Unknown target IDs return `404`, and self-blocking returns `422`.

**File:** `example-app/routes/api.php`

**Location:** Add the controller import with the other API controller imports, then add the routes inside the existing `auth:sanctum` group next to the user routes.

**Code:**

```php
use App\Http\Controllers\Api\UserBlockController;
```

```php
Route::post('/blocks/{userId}', [UserBlockController::class, 'store']);
Route::delete('/blocks/{userId}', [UserBlockController::class, 'destroy']);
```

**Explanation:** Both operations require authentication and derive the blocker from `$request->user()`.

## Step 4: Include block state in the existing single-user response

**Description:** Add `is_blocked_by_me` to `GET /api/users/{id}`. Return the boolean in the same response as the requested user's existing fields; do not require another request to find out whether the current user blocked this user.

**File:** `example-app/app/Http/Controllers/Api/UserController.php`

**Location:** Replace `show(int $id)` with the following method and add the `Request` import.

**Code:**

```php
use Illuminate\Http\Request;
```

```php
public function show(Request $request, int $id): JsonResponse
{
    $user = User::query()->findOrFail($id);

    return response()->json([
        ...$user->toArray(),
        'is_blocked_by_me' => $request->user()
            ->blockedUsers()
            ->whereKey($user->getKey())
            ->exists(),
    ]);
}
```

**Explanation:** The authenticated user is the relation owner, so `true` means the current user blocked the requested user. The API remains authenticated by the existing route middleware.

**File:** `example-app/tests/Feature/Chat/ListUsersTest.php`

**Location:** Add a test method to `ListUsersTest` for the existing `GET /api/users/{id}` endpoint.

**Code:**

```php
public function test_single_user_response_includes_whether_current_user_blocked_them(): void
{
    $current = User::factory()->create();
    $blocked = User::factory()->create();
    $unblocked = User::factory()->create();

    $current->blockedUsers()->attach($blocked->id);

    $this->actingAs($current)
        ->getJson('/api/users/'.$blocked->id)
        ->assertOk()
        ->assertJsonPath('id', $blocked->id)
        ->assertJsonPath('is_blocked_by_me', true);

    $this->actingAs($current)
        ->getJson('/api/users/'.$unblocked->id)
        ->assertOk()
        ->assertJsonPath('is_blocked_by_me', false);
}
```

**Explanation:** This verifies both boolean values and confirms the field is returned by the existing single-user response.

## Step 5: Reject blocked senders before message creation

**Description:** Before inserting or broadcasting, check whether the recipient has blocked the authenticated sender.

**File:** `example-app/app/Http/Controllers/ConversationController.php`

**Location:** In `store()`, directly after the existing self-message check and before `Conversation::create()`.

**Code:**

```php
abort_if(
    $receiver->blockedUsers()->whereKey($request->user()->getKey())->exists(),
    403,
    'You cannot message this user.'
);
```

**Explanation:** `$receiver->blockedUsers()` checks users that the recipient blocked. Rejecting here ensures neither the conversation row nor the subsequent `MessageSent` event is created. Keep the existing missing-user and self-message checks unchanged.

**File:** `example-app/tests/Feature/Chat/UserBlockingTest.php` (new file)

**Location:** Add feature tests for the block routes and send enforcement. Include these imports and test methods in a `Tests\Feature\Chat\UserBlockingTest` class using `RefreshDatabase`.

**Code:**

```php
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;
```

```php
public function test_user_can_block_and_unblock_another_user_idempotently(): void
{
    $blocker = User::factory()->create();
    $blocked = User::factory()->create();

    $this->actingAs($blocker)
        ->postJson('/api/blocks/'.$blocked->id)
        ->assertOk()
        ->assertJsonPath('message', 'User blocked.');

    $this->actingAs($blocker)
        ->postJson('/api/blocks/'.$blocked->id)
        ->assertOk();

    $this->assertDatabaseCount('user_blocks', 1);

    $this->actingAs($blocker)
        ->deleteJson('/api/blocks/'.$blocked->id)
        ->assertOk()
        ->assertJsonPath('message', 'User unblocked.');

    $this->actingAs($blocker)
        ->deleteJson('/api/blocks/'.$blocked->id)
        ->assertOk();

    $this->assertDatabaseMissing('user_blocks', [
        'blocker_id' => $blocker->id,
        'blocked_id' => $blocked->id,
    ]);
}

public function test_guest_cannot_block_a_user(): void
{
    $target = User::factory()->create();

    $this->postJson('/api/blocks/'.$target->id)->assertUnauthorized();
}

public function test_user_cannot_block_themself_or_a_missing_user(): void
{
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/blocks/'.$user->id)
        ->assertUnprocessable();

    $this->actingAs($user)
        ->postJson('/api/blocks/999999')
        ->assertNotFound();
}

public function test_blocked_user_cannot_message_the_blocker_and_no_event_is_dispatched(): void
{
    Event::fake([MessageSent::class]);

    $blocker = User::factory()->create();
    $blocked = User::factory()->create();

    $this->actingAs($blocker)->postJson('/api/blocks/'.$blocked->id)->assertOk();

    $this->actingAs($blocked)
        ->postJson('/api/conversations/'.$blocker->id, ['message' => 'Hello'])
        ->assertForbidden();

    $this->assertDatabaseMissing('conversations', [
        'sender_id' => $blocked->id,
        'receiver_id' => $blocker->id,
        'message' => 'Hello',
    ]);

    Event::assertNotDispatched(MessageSent::class);
}

public function test_blocker_can_still_message_the_blocked_user(): void
{
    $blocker = User::factory()->create();
    $blocked = User::factory()->create();

    $this->actingAs($blocker)->postJson('/api/blocks/'.$blocked->id)->assertOk();

    $this->actingAs($blocker)
        ->postJson('/api/conversations/'.$blocked->id, ['message' => 'Hello'])
        ->assertCreated();

    $this->assertDatabaseCount('conversations', 1);
}

public function test_user_can_message_another_user_who_has_not_blocked_them(): void
{
  $sender = User::factory()->create();
  $recipient = User::factory()->create();

  $this->actingAs($sender)
    ->postJson('/api/conversations/'.$recipient->id, ['message' => 'Hello'])
    ->assertCreated();

  $this->assertDatabaseCount('conversations', 1);
}
```

**Explanation:** These tests cover idempotent management, authentication, invalid targets, denied-message side effects, and allowed sends when the recipient has not blocked the sender.

## Step 6: Add frontend API types and mutations

**Description:** Type the single-user response field and expose mutations for the new block endpoints using the project's existing API builders.

**File:** `next-app/src/_api/types.ts`

**Location:** Add the selected-user type next to `User`.

**Code:**

```ts
export type SelectedUser = User & {
  is_blocked_by_me: boolean
}
```

**Explanation:** Keep `User` unchanged because other responses, including `/api/user`, do not currently contain this property.

**File:** `next-app/src/_api/client.ts`

**Location:** Add imports, the blocks query-key constant, type the `selectedUser` query, and add block/unblock mutations to `apiMutation`.

**Code:**

```ts
import { mutationBuilder, mutationBuilderDelete } from "./mutation-factory"
```

Replace the existing type import with:

```ts
import type {
  APIError,
  Conversation,
  LoginResponse,
  MutationResponse,
  SelectedUser,
  User,
} from "./types"
```

Add the query-key property:

```ts
  blocks: "/blocks",
```

Replace the existing selected-user builder:

```ts
  selectedUser: queryBuilder<SelectedUser>(_queryKeys.users),
```

Add the following entry inside `apiMutation`:

```ts
  blocks: {
    block: mutationBuilder<MutationResponse, APIError, Record<string, never>>(
      _queryKeys.blocks
    ),
    unblock: mutationBuilderDelete<MutationResponse, APIError>(_queryKeys.blocks),
  },
```

**Explanation:** The POST and DELETE URLs become `/blocks/{id}` via the existing mutation builders. The POST body is an empty object; the authenticated user remains the only source of `blocker_id`.

## Step 7: Wire the existing chat-header Block menu

**Description:** Replace the current placeholder menu item with a block/unblock action driven by the single-user response. Refresh that response after the mutation completes.

**File:** `next-app/src/app/(app)/dashboard/[id]/_blocks/chat-header.tsx`

**Location:** Add React Query mutation imports and query-client setup in `ChatHeader()`, then replace the current `DropdownMenuItem` that always says `Block`.

**Code:**

```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

```tsx
  const queryClient = useQueryClient()
  const { mutate: blockUser, isPending: isBlocking } = useMutation(
    apiMutation.blocks.block.mutation({
      param: id,
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: apiQuery.selectedUser.key(id),
        }),
    })
  )
  const { mutate: unblockUser, isPending: isUnblocking } = useMutation(
    apiMutation.blocks.unblock.mutation({
      param: id,
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: apiQuery.selectedUser.key(id),
        }),
    })
  )
```

Replace the existing Block menu item with:

```tsx
<DropdownMenuItem
  disabled={!data || isBlocking || isUnblocking}
  onClick={() => {
    if (data?.is_blocked_by_me) {
      unblockUser()
      return
    }

    blockUser({})
  }}
>
  <BlocksIcon /> {data?.is_blocked_by_me ? "Unblock" : "Block"}
</DropdownMenuItem>
```

Also add `apiMutation` to the import from `@/_api/client`.

**Explanation:** The menu label reflects the same response that provides the selected user's data. After a successful action, React Query refetches that user response, updating the label without a separate block-state request.

## Step 8: Keep blocked-send feedback in the composer

**Description:** Show Laravel's `403` message to the sender. Do not hide the composer based on `is_blocked_by_me`: that field says whether the current user blocked the recipient, not whether the recipient blocked the current user.

**File:** `next-app/src/app/(app)/dashboard/[id]/_blocks/chat-form.tsx`

**Location:** The existing `onError` callback in `ChatForm()` already displays the API message; retain this code while adding the server check.

**Code:**

```tsx
onError: (error) => {
  toast.error(error.response.data.message)
},
```

**Explanation:** Laravel returns a JSON `message` with the `403`, and the existing mutation displays it. Keep this fallback even if future UI changes disable some sends locally, because the server remains authoritative.

## Step 9: Document the API behavior

**Description:** Document the single-user response field, block-management endpoints, and the fact that rejected messages are neither stored nor broadcast.

**File:** `example-app/docs/realtime-chat.md`

**Location:** Append a `User blocking` section after the existing message-flow documentation.

**Code:**

```markdown
## User blocking

`GET /api/users/{id}` includes `is_blocked_by_me`, a boolean indicating whether the authenticated user blocked the requested user. This is part of the user response and does not require a separate request.

Use `POST /api/blocks/{userId}` to block and `DELETE /api/blocks/{userId}` to unblock. Both endpoints require authentication; Laravel derives the blocker from the signed-in user.

When a recipient has blocked the sender, `POST /api/conversations/{receiverId}` returns `403`. Laravel rejects the request before creating a conversation or dispatching `MessageSent`. Blocking is directional: the blocker can still message the blocked user.
```

**Explanation:** Keeps the existing realtime chat documentation aligned with the API and enforcement behavior.

## Step 10: Verify the changes

**Description:** Run the focused Laravel tests, then the Next.js typecheck and lint scripts.

**File:** `example-app/tests/Feature/Chat/UserBlockingTest.php` and `example-app/tests/Feature/Chat/ListUsersTest.php`

**Location:** Feature tests for block endpoints, blocked message rejection, and the single-user response field.

**Code:** Run from `example-app`:

```bash
php artisan test --compact tests/Feature/Chat/UserBlockingTest.php
php artisan test --compact tests/Feature/Chat/ListUsersTest.php
```

**Explanation:** These cover the backend behavior and response contract without running unrelated tests.

**File:** `next-app/package.json`

**Location:** Existing `typecheck` and `lint` scripts.

**Code:** Run from `next-app`:

```bash
bun run typecheck
bun run lint
```

**Explanation:** Verifies the TypeScript response type, mutation configuration, and header component.