<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TenantActionsLog extends Model
{
    use HasUuids;

    protected $table = 'tenant_actions_log';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = ['payload' => 'array', 'details' => 'array'];
}
