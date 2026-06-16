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
                'password'  => $data['password'],
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

    /**
     * Superadmin-only. Hard-deletes a tenant and every row scoped to it.
     * Replaces the legacy `superadmin_delete_tenant` Postgres RPC.
     */
    public function adminDelete(Request $request, string $tenantId): JsonResponse
    {
        abort_unless($request->user()?->isSuperadmin(), 403, 'Only superadmins may delete tenants.');

        $tenant = Tenant::query()->withoutGlobalScopes()->find($tenantId);
        abort_unless($tenant, 404, 'Tenant not found.');

        DB::transaction(function () use ($tenant) {
            $tid = $tenant->id;

            // Wipe every tenant-scoped row. We discover scoped tables by looking at
            // information_schema for any public table with a tenant_id column.
            $tables = DB::table('information_schema.columns')
                ->where('table_schema', 'public')
                ->where('column_name', 'tenant_id')
                ->pluck('table_name')
                ->reject(fn ($t) => in_array($t, ['tenants'], true))
                ->values();

            foreach ($tables as $table) {
                try {
                    DB::table($table)->where('tenant_id', $tid)->delete();
                } catch (\Throwable $e) {
                    // ignore tables we don't have privileges on / non-data tables
                }
            }

            // Drop staff users attached to the tenant (owner included).
            User::query()->withoutGlobalScopes()->where('tenant_id', $tid)->delete();

            // Finally drop the tenant row itself.
            Tenant::query()->withoutGlobalScopes()->where('id', $tid)->delete();
        });

        return response()->json(['ok' => true, 'tenant_id' => $tenantId]);
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