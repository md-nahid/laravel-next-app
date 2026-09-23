<?php

namespace Tests\Feature\Chat;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class ListUsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_list_users(): void
    {
        $response = $this->getJson('/api/users');

        $response->assertUnauthorized();
    }

    public function test_authenticated_user_sees_other_users_excluding_self(): void
    {
        $current = User::factory()->create(['name' => 'Me']);
        User::factory()->create(['name' => 'Alice']);
        User::factory()->create(['name' => 'Bob']);

        $response = $this->actingAs($current)->getJson('/api/users');

        $response->assertOk()
            ->assertJson(fn (AssertableJson $json): AssertableJson => $json
                ->has('data', 2)
                ->has('data.0', fn (AssertableJson $user): AssertableJson => $user
                    ->whereAllType([
                        'id' => 'integer',
                        'name' => 'string',
                    ])
                    ->missing('email')
                    ->etc())
                ->etc());

        $names = collect($response->json('data'))->pluck('name')->sort()->values()->all();

        $this->assertSame(['Alice', 'Bob'], $names);
    }

    public function test_search_filters_by_name_or_email(): void
    {
        $current = User::factory()->create();
        User::factory()->create(['name' => 'Alice Wonder', 'email' => 'alice@example.com']);
        User::factory()->create(['name' => 'Bob Builder', 'email' => 'bob@example.com']);

        $response = $this->actingAs($current)->getJson('/api/users?search=alice');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Alice Wonder');

        $responseEmail = $this->actingAs($current)->getJson('/api/users?search=bob@example');

        $responseEmail->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Bob Builder');
    }

    public function test_per_page_is_capped_and_defaults(): void
    {
        $current = User::factory()->create();
        User::factory()->count(25)->create();

        $response = $this->actingAs($current)->getJson('/api/users?per_page=10');

        $response->assertOk()->assertJsonCount(10, 'data');

        $invalid = $this->actingAs($current)->getJson('/api/users?per_page=101');

        $invalid->assertUnprocessable()->assertJsonValidationErrors(['per_page']);
    }
}
