<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SaasPackage extends Model
{
    use HasUuids;

    protected $table = 'saas_packages';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'enabled_modules' => 'array',
        'features' => 'array',
        'is_active' => 'boolean',
        'is_popular' => 'boolean',
        'is_trial' => 'boolean',
        'max_business_location' => 'integer',
        'max_invoice' => 'integer',
        'show_on_landing' => 'boolean',
    ];
}