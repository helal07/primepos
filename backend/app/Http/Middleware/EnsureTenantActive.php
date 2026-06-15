<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperadmin()) {
            return $next($request);
        }

        $tenant = $user->tenant;
        if (! $tenant) {
            return response()->json(['message' => 'No tenant assigned.'], 403);
        }

        if (! $tenant->isActive()) {
            return response()->json([
                'message' => 'Tenant is not active.',
                'status'  => $tenant->status,
            ], 403);
        }

        return $next($request);
    }
}