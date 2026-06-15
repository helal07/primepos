<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TenantNotification extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'tenant_notifications';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = ['data' => 'array', 'read_at' => 'datetime'];
}