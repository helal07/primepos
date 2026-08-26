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

    protected static function booted(): void
    {
        // Legacy columns name/phone are still populated for reporting and
        // older rows; derive them from the linked customer when omitted.
        $fill = function (InstallmentCustomer $row) {
            if ((! empty($row->name) && ! empty($row->phone)) || empty($row->customer_id)) {
                return;
            }
            $customer = Customer::query()->withoutGlobalScopes()->find($row->customer_id);
            if (! $customer) return;
            if (empty($row->name))  $row->name  = $customer->name;
            if (empty($row->phone)) $row->phone = $customer->phone;
        };

        static::creating($fill);
        static::updating($fill);
    }

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class, 'customer_id'); }
}
