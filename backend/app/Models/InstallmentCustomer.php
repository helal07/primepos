<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstallmentCustomer extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'installment_customers';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class, 'customer_id'); }
}
