<?php

namespace App\Rules;

use App\Models\PurchaseItem;
use App\Models\SaleItem;
use App\Models\ExchangePurchase;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Cross-table serial uniqueness for a tenant:
 * a serial number may exist on at most one
 * purchase_item, sale_item, or exchange_purchase row.
 */
class SerialUnique implements ValidationRule
{
    public function __construct(
        protected string $tenantId,
        protected ?string $ignoreTable = null,
        protected ?string $ignoreId = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value) return;
        $serial = (string) $value;

        $exists =
            $this->existsIn(PurchaseItem::class,    'purchase_items',    $serial, 'serial_number') ||
            $this->existsIn(SaleItem::class,        'sale_items',        $serial, 'serial_number') ||
            $this->existsIn(ExchangePurchase::class,'exchange_purchases',$serial, 'imei');

        if ($exists) {
            $fail("Serial number '{$serial}' is already used in this tenant.");
        }
    }

    protected function existsIn(string $modelClass, string $table, string $serial, string $column): bool
    {
        $q = $modelClass::query()->withoutGlobalScopes()
            ->where('tenant_id', $this->tenantId)
            ->where($column, $serial);
        if ($this->ignoreTable === $table && $this->ignoreId) {
            $q->where('id', '!=', $this->ignoreId);
        }
        return $q->exists();
    }
}