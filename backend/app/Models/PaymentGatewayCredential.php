<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PaymentGatewayCredential extends Model
{
    use HasUuids;
    protected $table = 'payment_gateway_credentials';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = [
        'config' => 'array',
    ];
}
