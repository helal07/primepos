<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasUuids, BelongsToTenant;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'is_system' => 'boolean',
        'is_default' => 'boolean',
    ];

    public function permissions(): HasMany
    {
        return $this->hasMany(RolePermission::class);
    }

    public function grants(): HasMany
    {
        return $this->hasMany(RolePermissionGrant::class);
    }
}