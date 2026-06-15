<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class StockTransfer extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'stock_transfers';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];


}
