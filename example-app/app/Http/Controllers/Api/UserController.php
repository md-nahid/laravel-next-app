<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexUsersRequest;
use App\Http\Resources\UserSummaryResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    /**
     * Paginated directory of users (excluding the authenticated user) for starting chats.
     */
    public function index(IndexUsersRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $validated = $request->validated();
        $perPage = $validated['per_page'] ?? 10;

        $users = User::query()
            ->select(['id', 'name'])
            // ->whereKeyNot($request->user()->id) // exclude the authenticated user from the results
            ->when(! empty($validated['search']), function ($query) use ($validated): void {
                $search = self::escapeIlike((string) $validated['search']);

                $query->where(function ($inner) use ($search): void {
                    $inner->where('name', 'ilike', '%'.$search.'%')
                        ->orWhere('email', 'ilike', '%'.$search.'%');
                });
            })
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(perPage: $perPage);

        return UserSummaryResource::collection($users);
    }

    /**
     * Escape `%`, `_`, and `\` for use inside PostgreSQL `ILIKE` patterns.
     */
    private static function escapeIlike(string $term): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
    }
}
