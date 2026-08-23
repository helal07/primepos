<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\RolePermissionGrant;
use App\Models\Tenant;
use App\Models\UserRole;
use Illuminate\Http\Request;

/**
 * "Who am I" endpoints used by the SPA on every page load.
 * Returns enabled modules + the merged permission set for the current user.
 *
 * NOTE: these used to call Postgres helper functions (public.is_superadmin /
 * public.is_tenant_manager_or_above) from the Supabase era. On MySQL those
 * calls throw, which made /api/me/permissions fail and hid most of the sidebar.
 * Everything is resolved in PHP now.
 */
class MeController extends Controller
{
    /** Tenant admin roles live on App\Models\User::ADMIN_ROLES. */


    private function isAdminUser($user): bool
    {
        return $user->isTenantAdmin();
    }


    public function modules(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperadmin() || ! $user->tenant_id) {
            return response()->json(['modules' => null, 'all' => true]);
        }

        $tenant = Tenant::withoutGlobalScopes()->with('package')->find($user->tenant_id);
        $fromTenant = $tenant?->enabled_modules ?? null;
        $fromPackage = $tenant?->package?->enabled_modules ?? null;
        $list = (is_array($fromTenant) && count($fromTenant)) ? $fromTenant : $fromPackage;

        return response()->json([
            'modules' => is_array($list) && count($list) ? array_values($list) : null,
            'all'     => ! (is_array($list) && count($list)),
        ]);
    }

    public function permissions(Request $request)
    {
        $user = $request->user();

        if ($this->isAdminUser($user)) {
            return response()->json(['isAdmin' => true, 'perms' => (object) [], 'keys' => []]);
        }

        $roleIds = UserRole::query()->withoutGlobalScopes()
            ->where('user_id', $user->id)->pluck('role_id')->all();
        if (! $roleIds) {
            return response()->json(['isAdmin' => false, 'perms' => (object) [], 'keys' => []]);
        }

        $rps = RolePermission::query()->withoutGlobalScopes()->whereIn('role_id', $roleIds)
            ->get(['module', 'can_view', 'can_create', 'can_edit', 'can_delete']);

        $perms = [];
        foreach ($rps as $r) {
            $cur = $perms[$r->module] ?? ['module' => $r->module, 'can_view' => false, 'can_create' => false, 'can_edit' => false, 'can_delete' => false];
            $perms[$r->module] = [
                'module'     => $r->module,
                'can_view'   => $cur['can_view']   || (bool) $r->can_view,
                'can_create' => $cur['can_create'] || (bool) $r->can_create,
                'can_edit'   => $cur['can_edit']   || (bool) $r->can_edit,
                'can_delete' => $cur['can_delete'] || (bool) $r->can_delete,
            ];
        }

        $keys = RolePermissionGrant::query()->withoutGlobalScopes()
            ->whereIn('role_id', $roleIds)->pluck('permission_key')->all();

        return response()->json([
            'isAdmin' => false,
            'perms'   => (object) $perms,
            'keys'    => array_values(array_unique($keys)),
        ]);
    }
}
