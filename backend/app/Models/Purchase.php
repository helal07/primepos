<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'purchases';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'purchase_date' => 'date',
    ];

    public function supplier(): BelongsTo { return $this->belongsTo(Supplier::class, 'supplier_id'); }
    public function items(): HasMany      { return $this->hasMany(PurchaseItem::class, 'purchase_id'); }
    public function payments(): HasMany   { return $this->hasMany(PurchasePayment::class, 'purchase_id'); }
}
