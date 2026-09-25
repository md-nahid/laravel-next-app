<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed five dummy users.
     */
    public function run(): void
    {
        User::factory()->count(5)->create([
            'password' => 'password',
        ]);
    }
}
