<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantUserController extends Controller
{
    /** Port of `create-tenant-user`. */
    public function store(Request $request): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:120'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'phone'    => ['nullable', 'string', 'max:32'],
            'password' => ['required', 'string', 'min:8'],
            'role_id'  => ['required', 'uuid'],
        ]);

        $tenantId = $auth->isSuperadmin() && $request->filled('tenant_id')
            ? $request->string('tenant_id')
            : $auth->tenant_id;

        $role = Role::query()->withoutGlobalScopes()->where('id', $data['role_id'])
            ->where(function ($q) use ($tenantId) {
                $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
            })->firstOrFail();

        $user = User::query()->withoutGlobalScopes()->create([
            'id'        => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'name'      => $data['name'],
            'email'     => $data['email'],
            'phone'     => $data['phone'] ?? null,
            'password'  => $data['password'],
            'status'    => 'active',
        ]);

        UserRole::query()->withoutGlobalScopes()->create([
            'id'        => (string) Str::uuid(),
            'user_id'   => $user->id,
            'role_id'   => $role->id,
            'tenant_id' => $tenantId,
        ]);

        return response()->json(['user' => $user], 201);
    }

    /** Port of `delete-tenant-user`. */
    public function destroy(Request $request, string $userId): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);
        abort_if($auth->id === $userId, 400, 'Cannot delete yourself.');

        $user = User::query()->withoutGlobalScopes()->findOrFail($userId);
        if (! $auth->isSuperadmin() && $user->tenant_id !== $auth->tenant_id) abort(403);

        $user->delete();
        return response()->json(['ok' => true]);
    }

    /** Port of `reset-tenant-password`. */
    public function resetPassword(Request $request, string $userId): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);

        $data = $request->validate(['password' => ['required', 'string', 'min:8']]);

        $user = User::query()->withoutGlobalScopes()->findOrFail($userId);
        if (! $auth->isSuperadmin() && $user->tenant_id !== $auth->tenant_id) abort(403);

        $user->forceFill(['password' => $data['password']])->saveQuietly();
        return response()->json(['ok' => true]);
    }
}