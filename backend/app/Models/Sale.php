<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'sales';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'additional_expenses' => 'array',
        'sale_date' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class, 'sale_id');
    }

    public function payments()
    {
        return $this->hasMany(SalePayment::class, 'sale_id');
    }
}
