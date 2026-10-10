<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    // public function index(Request $request): JsonResponse
    // {
    //     $validatedData = $request->validate([
    //         'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
    //     ]);

    //     $authenticatedUserId = $request->user()->id;

    //     $conversations = Conversation::query()
    //         ->where('sender_id', $authenticatedUserId)
    //         ->orWhere('receiver_id', $authenticatedUserId)
    //         ->latest()
    //         ->paginate($validatedData['per_page'] ?? 10);

    //     return response()->json($conversations);
    // }

    public function between(Request $request, int $conversationPartnerId): JsonResponse
    {
        $validatedData = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $authenticatedUserId = $request->user()->id;
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
            ->latest()
            ->paginate($validatedData['per_page'] ?? 100);

        $conversations->setCollection(
            $conversations->getCollection()
                ->reverse()
                ->values()
                ->transform(function (Conversation $conversation) use ($authenticatedUserId): array {
                    return [
                        ...$conversation->toArray(),
                        'is_mine' => $conversation->sender_id === $authenticatedUserId,
                    ];
                })
        );

        return response()->json($conversations);
    }

    public function store(Request $request, int $receiverId): JsonResponse
    {
        $validatedData = $request->validate([
            'message' => ['required', 'string', 'max:500'],
        ]);

        $receiver = User::query()->findOrFail($receiverId);

        abort_if($receiver->is($request->user()), 422, 'You cannot message yourself.');

        abort_if(
            $receiver->blockedUsers()->whereKey($request->user()->getKey())->exists(),
            403,
            'You cannot message this user.'
        );

        $conversation = Conversation::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $receiverId,
            'message' => $validatedData['message'],
        ]);

        MessageSent::dispatch($conversation);

        return response()->json($conversation, 201);
    }
}
