<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsPurchase extends Model
{
    use HasUuids;
    protected $table = 'sms_purchases';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = ['purchased_at' => 'datetime'];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SmsPlan::class, 'sms_plan_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
