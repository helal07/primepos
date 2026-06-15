<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PaymentGateway extends Model
{
    use HasUuids;

    protected $table = 'payment_gateways';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = ['is_active' => 'boolean'];
}