<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\RolePermissionGrant;
use App\Models\Tenant;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * "Who am I" endpoints used by the SPA on every page load.
 * Returns enabled modules + the merged permission set for the current user.
 */
class MeController extends Controller
{
    public function modules(Request $request)
    {
        $user = $request->user();

        $isSuper = (bool) DB::selectOne('select public.is_superadmin(?) as ok', [$user->id])->ok ?? false;
        if ($isSuper) {
            return response()->json(['modules' => null, 'all' => true]);
        }

        if (! $user->tenant_id) {
            return response()->json(['modules' => null, 'all' => true]);
        }

        $tenant = Tenant::with('package')->find($user->tenant_id);
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

        $tm = (bool) DB::selectOne('select public.is_tenant_manager_or_above(?) as ok', [$user->id])->ok ?? false;
        if ($tm) {
            return response()->json(['isAdmin' => true, 'perms' => (object) [], 'keys' => []]);
        }

        $roleIds = UserRole::query()->where('user_id', $user->id)->pluck('role_id')->all();
        if (! $roleIds) {
            return response()->json(['isAdmin' => false, 'perms' => (object) [], 'keys' => []]);
        }

        $rps = RolePermission::query()->whereIn('role_id', $roleIds)
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

        $keys = RolePermissionGrant::query()->whereIn('role_id', $roleIds)->pluck('permission_key')->all();

        return response()->json([
            'isAdmin' => false,
            'perms'   => (object) $perms,
            'keys'    => array_values(array_unique($keys)),
        ]);
    }
}
