<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'purchase_orders';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class, 'supplier_id'); }
    public function items(): HasMany      { return $this->hasMany(PurchaseOrderItem::class, 'purchase_order_id'); }
}