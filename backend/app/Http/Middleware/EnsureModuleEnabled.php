<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if ($user->isSuperadmin()) {
            return $next($request);
        }
        $tenant = $user->tenant;
        if (! $tenant || ! $tenant->hasModule($module)) {
            return response()->json([
                'message' => "Module '{$module}' is not enabled for your plan.",
                'module'  => $module,
            ], 403);
        }
        return $next($request);
    }
}