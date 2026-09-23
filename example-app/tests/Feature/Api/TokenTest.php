<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_credentials_return_bearer_token(): void
    {
        $user = User::factory()->create([
            'email' => 'jhon@doe.com',
            'password' => 'password',
        ]);

        $response = $this->postJson('/api/tokens', [
            'email' => 'jhon@doe.com',
            'password' => 'password',
            'device_name' => 'postman',
        ]);

        $response->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure(['token']);

        $token = $response->json('token');

        $this->assertIsString($token);
        $this->assertNotEmpty($token);

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', $user->email);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->create([
            'email' => 'jhon@doe.com',
            'password' => 'password',
        ]);

        $response = $this->postJson('/api/tokens', [
            'email' => 'jhon@doe.com',
            'password' => 'wrong-password',
            'device_name' => 'postman',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_device_name_is_required(): void
    {
        User::factory()->create();

        $response = $this->postJson('/api/tokens', [
            'email' => 'jhon@doe.com',
            'password' => 'password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['device_name']);
    }
}
