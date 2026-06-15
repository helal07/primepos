<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'suppliers';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];


}
