<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\BroadcastsTenantChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarrantyClaim extends Model
{
    use HasUuids, BelongsToTenant, BroadcastsTenantChanges;

    public static function broadcastResource(): string { return 'warranty_claims'; }

    protected $table = 'warranty_claims';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'claim_date' => 'date',
        'resolved_date' => 'date',
    ];

    public function warranty(): BelongsTo
    {
        return $this->belongsTo(Warranty::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
