<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransfer extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'stock_transfers';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    public function product(): BelongsTo   { return $this->belongsTo(Product::class); }
    public function variation(): BelongsTo { return $this->belongsTo(ProductVariation::class, 'variation_id'); }
}
