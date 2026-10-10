<?php

namespace Tests\Feature\Chat;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserBlockingTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_block_and_unblock_another_user(): void
    {
        $blocker = User::factory()->create();
        $blocked = User::factory()->create();

        $this->actingAs($blocker)
            ->postJson('/api/blocks/'.$blocked->id)
            ->assertOk()
            ->assertJsonPath('message', 'User blocked.');

        $this->assertDatabaseHas('user_blocks', [
            'blocker_id' => $blocker->id,
            'blocked_id' => $blocked->id,
        ]);

        $this->actingAs($blocker)
            ->deleteJson('/api/blocks/'.$blocked->id)
            ->assertOk()
            ->assertJsonPath('message', 'User unblocked.');

        $this->assertDatabaseMissing('user_blocks', [
            'blocker_id' => $blocker->id,
            'blocked_id' => $blocked->id,
        ]);
    }

    public function test_blocked_user_cannot_message_blocker(): void
    {
        $blocker = User::factory()->create();
        $blocked = User::factory()->create();

        $this->actingAs($blocker)
            ->postJson('/api/blocks/'.$blocked->id)
            ->assertOk();

        $this->actingAs($blocked)
            ->postJson('/api/conversations/'.$blocker->id, ['message' => 'Hello there'])
            ->assertForbidden();
    }

    public function test_blocker_can_still_message_blocked_user(): void
    {
        $blocker = User::factory()->create();
        $blocked = User::factory()->create();

        $this->actingAs($blocker)
            ->postJson('/api/blocks/'.$blocked->id)
            ->assertOk();

        $this->actingAs($blocker)
            ->postJson('/api/conversations/'.$blocked->id, ['message' => 'Hello there'])
            ->assertCreated();
    }

    public function test_single_user_response_includes_block_state(): void
    {
        $current = User::factory()->create();
        $blocked = User::factory()->create();
        $other = User::factory()->create();

        $current->blockedUsers()->attach($blocked->id);

        $this->actingAs($current)
            ->getJson('/api/users/'.$blocked->id)
            ->assertOk()
            ->assertJsonPath('is_blocked_by_me', true)
            ->assertJsonPath('is_blocking_me', false);

        $this->actingAs($blocked)
            ->getJson('/api/users/'.$current->id)
            ->assertOk()
            ->assertJsonPath('is_blocked_by_me', false)
            ->assertJsonPath('is_blocking_me', true);

        $this->actingAs($current)
            ->getJson('/api/users/'.$other->id)
            ->assertOk()
            ->assertJsonPath('is_blocked_by_me', false)
            ->assertJsonPath('is_blocking_me', false);
    }
}
