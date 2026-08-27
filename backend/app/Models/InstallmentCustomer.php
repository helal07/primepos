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

        // NID is mandatory for installment customers — it is the key used for
        // the cross-tenant credit risk check.
        $requireNid = function (InstallmentCustomer $row) {
            if (! array_key_exists('nid', $row->getAttributes()) && $row->exists) {
                return; // partial update that does not touch nid
            }
            $nid = preg_replace('/\D+/', '', (string) ($row->nid ?? ''));
            if (strlen($nid) < 8 || strlen($nid) > 25) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'nid' => ['NID number is required and must be 8-25 digits.'],
                ]);
            }
            $row->nid = $nid;
        };

        static::creating($fill);
        static::updating($fill);
        static::creating($requireNid);
        static::updating($requireNid);
    }


    public function customer(): BelongsTo { return $this->belongsTo(Customer::class, 'customer_id'); }
}
