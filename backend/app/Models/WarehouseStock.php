<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function product(): BelongsTo   { return $this->belongsTo(Product::class); }
    public function variation(): BelongsTo { return $this->belongsTo(ProductVariation::class, 'variation_id'); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
}
