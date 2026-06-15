<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\SaasPackage;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantController extends Controller
{
    /**
     * Public self-signup. Port of `tenant-signup` edge function.
     */
    public function signup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_name' => ['required', 'string', 'max:200'],
            'slug'          => ['nullable', 'string', 'alpha_dash', 'max:80'],
            'owner_name'    => ['required', 'string', 'max:120'],
            'email'         => ['required', 'email', 'max:200', 'unique:users,email'],
            'phone'         => ['nullable', 'string', 'max:32'],
            'password'      => ['required', 'string', 'min:8'],
            'package_id'    => ['nullable', 'uuid'],
        ]);

        return DB::transaction(function () use ($data) {
            $package = $data['package_id']
                ? SaasPackage::find($data['package_id'])
                : SaasPackage::where('is_active', true)->orderBy('price')->first();

            $slug = $data['slug'] ?? Str::slug($data['business_name']);
            $slug = $this->uniqueSlug($slug);

            $tenant = Tenant::query()->withoutGlobalScopes()->create([
                'id'            => (string) Str::uuid(),
                'name'          => $data['business_name'],
                'slug'          => $slug,
                'email'         => $data['email'],
                'phone'         => $data['phone'] ?? null,
                'package_id'    => $package?->id,
                'status'        => 'trial',
                'trial_ends_at' => Carbon::today()->addDays((int) config('app.trial_days', 14)),
            ]);

            $user = User::query()->withoutGlobalScopes()->create([
                'id'        => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'name'      => $data['owner_name'],
                'email'     => $data['email'],
                'phone'     => $data['phone'] ?? null,
                'password'  => Hash::make($data['password']),
                'status'    => 'active',
            ]);

            $tenant->forceFill(['owner_user_id' => $user->id])->saveQuietly();

            $role = Role::query()->withoutGlobalScopes()->create([
                'id'         => (string) Str::uuid(),
                'tenant_id'  => $tenant->id,
                'name'       => 'tenant_admin',
                'is_system'  => true,
                'is_default' => true,
            ]);

            UserRole::query()->withoutGlobalScopes()->create([
                'id'        => (string) Str::uuid(),
                'user_id'   => $user->id,
                'role_id'   => $role->id,
                'tenant_id' => $tenant->id,
            ]);

            return response()->json([
                'tenant' => $tenant,
                'user'   => ['id' => $user->id, 'email' => $user->email],
            ], 201);
        });
    }

    /**
     * Superadmin-only. Port of `admin-create-tenant`.
     */
    public function adminCreate(Request $request): JsonResponse
    {
        return $this->signup($request);
    }

    private function uniqueSlug(string $base): string
    {
        $slug = $base ?: 'tenant';
        $i = 1;
        while (Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . ++$i;
        }
        return $slug;
    }
}