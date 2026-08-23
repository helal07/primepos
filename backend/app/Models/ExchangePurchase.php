<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Services\NumberGeneratorService;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExchangePurchase extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'exchange_purchases';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'goods_photos' => 'array',
        'purchase_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (! $model->reference_no) {
                $model->reference_no = app(NumberGeneratorService::class)
                    ->next($model->tenant_id, 'exchange_purchase', 'EXB-', 6);
            }
            if (! $model->status) {
                $model->status = 'in_stock';
            }
        });
    }
}
