<?php

namespace Tests\Feature\Chat;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConversationParticipantsTest extends TestCase
{
    use RefreshDatabase;

    public function test_message_participants_are_existing_users(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();

        $response = $this->actingAs($sender)->postJson('/api/conversations/'.$receiver->id, [
            'message' => 'Hello there',
        ]);

        $response->assertCreated()
            ->assertJsonMissingPath('sender_id')
            ->assertJsonMissingPath('receiver_id');

        $conversation = Conversation::query()->firstOrFail();

        $this->assertTrue($conversation->sender->is($sender));
        $this->assertTrue($conversation->receiver->is($receiver));
        $this->assertTrue($sender->conversationsSent()->exists());
        $this->assertTrue($receiver->conversationsReceived()->exists());

        $fetchResponse = $this->actingAs($sender)->getJson('/api/conversations/'.$receiver->id);

        $fetchResponse->assertOk()
            ->assertJsonMissingPath('data.0.sender_id')
            ->assertJsonMissingPath('data.0.receiver_id')
            ->assertJsonPath('data.0.sender.id', $sender->id)
            ->assertJsonPath('data.0.sender.name', $sender->name)
            ->assertJsonPath('data.0.sender.email', $sender->email)
            ->assertJsonPath('data.0.receiver.id', $receiver->id)
            ->assertJsonPath('data.0.receiver.name', $receiver->name)
            ->assertJsonPath('data.0.receiver.email', $receiver->email);
    }

    public function test_message_cannot_be_sent_to_a_nonexistent_user(): void
    {
        $sender = User::factory()->create();

        $this->actingAs($sender)
            ->postJson('/api/conversations/999999', ['message' => 'Hello there'])
            ->assertNotFound();
    }

    public function test_user_cannot_send_a_message_to_themself(): void
    {
        $sender = User::factory()->create();

        $this->actingAs($sender)
            ->postJson('/api/conversations/'.$sender->id, ['message' => 'Hello there'])
            ->assertUnprocessable();
    }
}
