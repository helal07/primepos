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
     * Superadmin-only tenant creation from the admin panel.
     * Contract (see src/lib/functions.ts adminCreateTenant):
     *   admin_email, admin_password, admin_display_name?, choice, tenant{...}, payment{}?
     */
    public function adminCreate(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isSuperadmin(), 403, 'Only superadmins may create tenants.');

        $data = $request->validate([
            'admin_email'               => ['required', 'email', 'max:200', 'unique:users,email'],
            'admin_password'            => ['required', 'string', 'min:6'],
            'admin_display_name'        => ['nullable', 'string', 'max:120'],
            'choice'                    => ['nullable', 'in:trial,paid,active'],
            'tenant'                    => ['required', 'array'],
            'tenant.name'               => ['required', 'string', 'max:200'],
            'tenant.company_name'       => ['nullable', 'string', 'max:200'],
            'tenant.slug'               => ['nullable', 'string', 'alpha_dash', 'max:80'],
            'tenant.email'              => ['nullable', 'email', 'max:200'],
            'tenant.phone'              => ['nullable', 'string', 'max:32'],
            'tenant.address'            => ['nullable', 'string'],
            'tenant.domain'             => ['nullable', 'string', 'max:200'],
            'tenant.package_id'         => ['nullable', 'uuid'],
            'tenant.subscription_type'  => ['nullable', 'string', 'max:32'],
            'tenant.subscription_start' => ['nullable', 'date'],
            'tenant.subscription_end'   => ['nullable', 'date'],
            'tenant.status'             => ['nullable', 'string', 'max:32'],
            'tenant.notes'              => ['nullable', 'string'],
            'payment'                   => ['nullable', 'array'],
            'payment.method'            => ['nullable', 'string', 'max:40'],
            'payment.amount'            => ['nullable', 'numeric'],
        ]);

        $t       = $data['tenant'];
        $choice  = $data['choice'] ?? 'trial';
        $actorId = $request->user()->id;

        return DB::transaction(function () use ($data, $t, $choice, $actorId) {
            $package = ! empty($t['package_id']) ? SaasPackage::query()->withoutGlobalScopes()->find($t['package_id']) : null;

            $status = $t['status'] ?? match ($choice) {
                'active' => 'active',
                'paid'   => 'pending_approval',
                default  => 'trial',
            };

            $start = ! empty($t['subscription_start']) ? Carbon::parse($t['subscription_start']) : Carbon::today();
            $end   = ! empty($t['subscription_end'])
                ? Carbon::parse($t['subscription_end'])
                : ($status === 'active' ? $start->copy()->addDays((int) ($package->duration_days ?? 30)) : null);

            $tenant = Tenant::query()->withoutGlobalScopes()->create(array_filter([
                'id'                 => (string) Str::uuid(),
                'name'               => $t['name'],
                'company_name'       => $t['company_name'] ?? null,
                'slug'               => $this->uniqueSlug($t['slug'] ?? Str::slug($t['name'])),
                'email'              => $t['email'] ?? $data['admin_email'],
                'phone'              => $t['phone'] ?? null,
                'address'            => $t['address'] ?? null,
                'domain'             => ! empty($t['domain']) ? $t['domain'] : null,
                'package_id'         => $package?->id,
                'status'             => $status,
                'subscription_type'  => $t['subscription_type'] ?? 'monthly',
                'subscription_start' => $status === 'trial' ? null : $start->toDateString(),
                'subscription_end'   => $end?->toDateString(),
                'trial_ends_at'      => $status === 'trial'
                    ? Carbon::today()->addDays((int) config('app.trial_days', 14))->toDateString()
                    : null,
                'notes'              => $t['notes'] ?? null,
            ], fn ($v) => $v !== null));

            $user = User::query()->withoutGlobalScopes()->create([
                'id'        => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'name'      => ($data['admin_display_name'] ?? null) ?: $t['name'],
                'email'     => $data['admin_email'],
                'phone'     => $t['phone'] ?? null,
                // The User model casts `password` as hashed — never pre-hash here.
                'password'  => $data['admin_password'],
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

            $amount = $data['payment']['amount'] ?? null;
            if ($choice === 'active' && $amount !== null) {
                DB::table('tenant_payments')->insert([
                    'id'             => (string) Str::uuid(),
                    'tenant_id'      => $tenant->id,
                    'package_id'     => $package?->id,
                    'amount'         => (float) $amount,
                    'payment_method' => $data['payment']['method'] ?? 'manual',
                    'status'         => 'approved',
                    'paid_at'        => now(),
                    'approved_at'    => now(),
                    'approved_by'    => $actorId,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            return response()->json([
                'tenant_id' => $tenant->id,
                'user_id'   => $user->id,
                'tenant'    => $tenant->refresh(),
            ], 201);
        });
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