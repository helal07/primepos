<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TenantPayment extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'tenant_payments';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'gateway_response' => 'array',
        'paid_at' => 'datetime',
    ];
}