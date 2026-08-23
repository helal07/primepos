<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Key/value tenant settings. `tenant_id` is nullable for global super-admin
 * settings (landing CMS), so we deliberately do NOT use BelongsToTenant —
 * callers MUST filter by tenant_id explicitly.
 */
class BusinessSetting extends Model
{
    use HasUuids;

    protected $table = 'business_settings';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = [
        'value' => 'array',
    ];
}
