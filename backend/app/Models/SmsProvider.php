<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SmsProvider extends Model
{
    use HasUuids;
    protected $table = 'sms_providers';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = [
        'is_active' => 'boolean',
    ];
}
