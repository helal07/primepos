<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (in_array('superadmin', $roles, true) && $user->isSuperadmin()) {
            return $next($request);
        }
        if ($user->hasRole(...$roles)) {
            return $next($request);
        }
        return response()->json(['message' => 'Forbidden.'], 403);
    }
}