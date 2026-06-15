<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'accounts';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];


}
