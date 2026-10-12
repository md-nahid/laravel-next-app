<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_delete_their_view_without_deleting_the_partners_history(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();
        $this->createMessage($user, $partner, 'From user');
        $this->createMessage($partner, $user, 'From partner');

        $this->actingAs($user)
            ->deleteJson('/api/conversations/'.$partner->id)
            ->assertOk()
            ->assertJsonPath('message', 'Conversation deleted.');

        $this->assertDatabaseCount('conversations', 2);

        $this->actingAs($user)
            ->getJson('/api/conversations/'.$partner->id)
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('total', 0);

        $this->actingAs($partner)
            ->getJson('/api/conversations/'.$user->id)
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['message' => 'From user'])
            ->assertJsonFragment(['message' => 'From partner']);
    }

    public function test_new_messages_after_deletion_are_visible_without_old_history(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();
        $this->createMessage($user, $partner, 'Old message');

        $this->actingAs($user)
            ->deleteJson('/api/conversations/'.$partner->id)
            ->assertOk();

        $this->createMessage($partner, $user, 'New message from partner');
        $this->createMessage($user, $partner, 'New message from user');

        $this->actingAs($user)
            ->getJson('/api/conversations/'.$partner->id)
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['message' => 'New message from partner'])
            ->assertJsonFragment(['message' => 'New message from user'])
            ->assertJsonMissing(['message' => 'Old message']);
    }

    public function test_repeated_deletion_advances_the_cutoff(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();
        $this->createMessage($user, $partner, 'First message');

        $this->actingAs($user)
            ->deleteJson('/api/conversations/'.$partner->id)
            ->assertOk();

        $this->createMessage($partner, $user, 'Second message');

        $this->actingAs($user)
            ->deleteJson('/api/conversations/'.$partner->id)
            ->assertOk();

        $this->actingAs($user)
            ->getJson('/api/conversations/'.$partner->id)
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->createMessage($user, $partner, 'Third message');

        $this->actingAs($user)
            ->getJson('/api/conversations/'.$partner->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.message', 'Third message');
    }

    public function test_guest_cannot_delete_a_conversation(): void
    {
        $partner = User::factory()->create();

        $this->deleteJson('/api/conversations/'.$partner->id)
            ->assertUnauthorized();
    }

    public function test_deletion_requires_an_existing_other_user(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->deleteJson('/api/conversations/999999')
            ->assertNotFound();
    }

    public function test_user_cannot_delete_a_conversation_with_themself(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->deleteJson('/api/conversations/'.$user->id)
            ->assertUnprocessable();
    }

    public function test_deleting_a_conversation_with_no_messages_succeeds(): void
    {
        $user = User::factory()->create();
        $partner = User::factory()->create();

        $this->actingAs($user)
            ->deleteJson('/api/conversations/'.$partner->id)
            ->assertOk();

        $this->createMessage($partner, $user, 'First message');

        $this->actingAs($user)
            ->getJson('/api/conversations/'.$partner->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.message', 'First message');
    }

    private function createMessage(User $sender, User $receiver, string $message): Conversation
    {
        return Conversation::query()->create([
            'sender_id' => $sender->id,
            'receiver_id' => $receiver->id,
            'message' => $message,
        ]);
    }
}
