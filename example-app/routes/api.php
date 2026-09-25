<?php

use App\Http\Controllers\Api\TokenController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\ConversationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// only for postman testing
Route::post('/tokens', [TokenController::class, 'store'])
    ->middleware('throttle:login')
    ->name('api.tokens.store');

// other routes require authentication
Route::middleware('auth:sanctum')->group(function (): void {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);

    // Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{conversationPartnerId}', [ConversationController::class, 'between']);
    Route::post('/conversations/{receiverId}', [ConversationController::class, 'store']);
});
