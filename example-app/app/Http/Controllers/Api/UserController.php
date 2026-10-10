<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexUsersRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(IndexUsersRequest $request)
    {
        // $this->authorize('viewAny', User::class);

        $validated = $request->validated();
        $perPage = $validated['per_page'] ?? 10;
        $pagination = filter_var($request->input('pagination', true), FILTER_VALIDATE_BOOLEAN);

        $users = User::query()
            ->whereKeyNot($request->user()->id); // exclude the authenticated user from the results

        if (!$pagination) {
            $users = $users->get();
            return $users->toArray();
        };

        $users = $users->paginate($perPage);
        return $users->toArray();
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);
        $isBlockedByMe = $request->user()
            ->blockedUsers()
            ->whereKey($id)
            ->exists();

        $isBlockingMe = $user
            ->blockedUsers()
            ->whereKey($request->user()->getKey())
            ->exists();

        return response()->json([
            ...$user->toArray(),
            'is_blocked_by_me' => $isBlockedByMe,
            'is_blocking_me' => $isBlockingMe,
        ]);
    }
}
