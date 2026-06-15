<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InstallmentSale extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'installment_sales';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    public function customer(): BelongsTo            { return $this->belongsTo(Customer::class, 'customer_id'); }
    public function product(): BelongsTo             { return $this->belongsTo(Product::class, 'product_id'); }
    public function installmentCustomer(): BelongsTo { return $this->belongsTo(InstallmentCustomer::class, 'installment_customer_id'); }
    public function schedules(): HasMany             { return $this->hasMany(InstallmentSchedule::class, 'installment_sale_id'); }
}
