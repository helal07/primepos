<?php

namespace App\Observers;

use App\Models\StockAdjustment;
use App\Services\WarehouseStockService;

class StockAdjustmentObserver
{
    public function __construct(protected WarehouseStockService $stock) {}

    public function created(StockAdjustment $a): void
    {
        if (! $a->warehouse_id) return;
        $sign = $a->adjustment_type === 'increase' ? 1 : -1;
        $this->stock->applyDelta(
            $a->tenant_id, $a->warehouse_id,
            $a->product_id, $a->variation_id,
            $sign * (float) $a->quantity
        );
    }

    public function deleted(StockAdjustment $a): void
    {
        if (! $a->warehouse_id) return;
        $sign = $a->adjustment_type === 'increase' ? -1 : 1; // reverse
        $this->stock->applyDelta(
            $a->tenant_id, $a->warehouse_id,
            $a->product_id, $a->variation_id,
            $sign * (float) $a->quantity
        );
    }
}