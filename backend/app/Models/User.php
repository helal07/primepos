<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasUuids, Notifiable;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name', 'email', 'phone', 'password',
        'tenant_id', 'is_superadmin', 'status',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    public function isSuperadmin(): bool
    {
        return (bool) $this->is_superadmin;
    }

    /**
     * Role names assigned to this user.
     * @return array<int, string>
     */
    public function roleNames(): array
    {
        return $this->userRoles()->with('role')->get()
            ->pluck('role.name')->filter()->values()->all();
    }

    public function hasRole(string ...$names): bool
    {
        if ($this->isSuperadmin() && in_array('superadmin', $names, true)) {
            return true;
        }
        $mine = $this->roleNames();
        foreach ($names as $n) {
            if (in_array($n, $mine, true)) return true;
        }
        return false;
    }

    /** Role names that get full access inside their own tenant. */
    public const ADMIN_ROLES = ['tenant_admin', 'owner', 'admin', 'manager'];

    /**
     * True when the user is a tenant-level administrator (full access inside
     * their tenant). Mirrors MeController::isAdminUser so the sidebar and the
     * REST guards agree.
     */
    public function isTenantAdmin(): bool
    {
        return $this->isSuperadmin() || $this->hasRole(...self::ADMIN_ROLES);
    }

    /**
     * Module-action permission check.
     * action ∈ view|create|edit|delete
     */
    public function canModule(string $module, string $action = 'view'): bool
    {
        if ($this->isTenantAdmin()) return true;
        $col = match ($action) {
            'view'   => 'can_view',
            'create' => 'can_create',
            'edit'   => 'can_edit',
            'delete' => 'can_delete',
            default  => 'can_view',
        };
        $roleIds = $this->userRoles()->pluck('role_id');
        if ($roleIds->isEmpty()) return false;
        return RolePermission::query()
            ->withoutGlobalScopes()
            ->whereIn('role_id', $roleIds)
            ->where('module', $module)
            ->where($col, true)
            ->exists();
    }

    /**
     * Dotted permission like "sell.view_all". Looks at role_permission_grants.
     */
    public function hasPerm(string $key): bool
    {
        if ($this->isTenantAdmin()) return true;
        $roleIds = $this->userRoles()->pluck('role_id');
        if ($roleIds->isEmpty()) return false;
        return RolePermissionGrant::query()
            ->withoutGlobalScopes()
            ->whereIn('role_id', $roleIds)
            ->where('permission_key', $key)
            ->exists();
    }


    public function sellScope(): string
    {
        if ($this->isSuperadmin()) return 'all';
        if ($this->hasPerm('sell.view_all') || $this->hasRole('tenant_admin', 'manager')) return 'all';
        if ($this->hasPerm('sell.view_own')) return 'own';
        return 'none';
    }
}