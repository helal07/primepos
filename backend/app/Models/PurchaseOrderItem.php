<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'purchase_order_items';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    public $timestamps = false;

    public function purchaseOrder(): BelongsTo { return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id'); }
    public function product(): BelongsTo       { return $this->belongsTo(Product::class, 'product_id'); }
    public function variation(): BelongsTo     { return $this->belongsTo(ProductVariation::class, 'variation_id'); }
}