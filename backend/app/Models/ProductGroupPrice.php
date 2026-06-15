<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ProductGroupPrice extends Model
{
    use HasUuids, BelongsToTenant;
    protected $table = 'product_group_prices';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
}
