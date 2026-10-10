<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserBlockController extends Controller
{
    public function store(Request $request, int $userId): JsonResponse
    {
        $target = User::query()->findOrFail($userId);

        abort_if($target->is($request->user()), 422, 'You cannot block yourself.');

        $request->user()->blockedUsers()->syncWithoutDetaching([$target->getKey()]);

        return response()->json(['message' => 'User blocked.']);
    }

    public function destroy(Request $request, int $userId): JsonResponse
    {
        $target = User::query()->findOrFail($userId);

        $request->user()->blockedUsers()->detach($target->getKey());

        return response()->json(['message' => 'User unblocked.']);
    }
}
