<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class WarehouseStock extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'warehouse_stock';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'quantity' => 'decimal:3',
    ];
}
