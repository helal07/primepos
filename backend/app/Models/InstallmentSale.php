<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class InstallmentSale extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'installment_sales';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];


}
