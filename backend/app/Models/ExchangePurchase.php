<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExchangePurchase extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'exchange_purchases';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];


}
