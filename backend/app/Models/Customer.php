<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'customers';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];


}
