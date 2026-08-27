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

    protected $casts = [
        'sale_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::creating(function (InstallmentSale $row) {
            $gen = app(\App\Services\NumberGeneratorService::class);

            foreach (['invoice_no', 'invoice_number'] as $col) {
                if (\Illuminate\Support\Facades\Schema::hasColumn($row->getTable(), $col) && empty($row->{$col})) {
                    $row->{$col} = $gen->nextInstallment($row->tenant_id);
                }
            }

            if (empty($row->status))    $row->status = 'active';
            if (empty($row->sale_date)) $row->sale_date = now()->toDateString();

            // Legacy NOT NULL mirrors of the current contract columns.
            $mirrors = [
                'start_date'          => $row->sale_date,
                'tenure_months'       => $row->num_installments,
                'interest_rate'       => $row->interest_percent,
                'financed_amount'     => $row->remaining_amount,
                'monthly_installment' => ($row->num_installments ?? 0) > 0
                    ? round(((float) $row->remaining_amount) / (int) $row->num_installments, 2)
                    : 0,
            ];
            foreach ($mirrors as $col => $value) {
                if ($value !== null
                    && \Illuminate\Support\Facades\Schema::hasColumn($row->getTable(), $col)
                    && empty($row->{$col})) {
                    $row->{$col} = $value;
                }
            }
        });
    }

    public function customer(): BelongsTo            { return $this->belongsTo(Customer::class, 'customer_id'); }
    public function product(): BelongsTo             { return $this->belongsTo(Product::class, 'product_id'); }
    public function installmentCustomer(): BelongsTo { return $this->belongsTo(InstallmentCustomer::class, 'installment_customer_id'); }
    public function schedules(): HasMany             { return $this->hasMany(InstallmentSchedule::class, 'installment_sale_id'); }
    public function collections(): HasMany           { return $this->hasMany(InstallmentCollection::class, 'installment_sale_id'); }


}
