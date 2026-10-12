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
