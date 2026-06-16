<?php

namespace App\Observers;

use App\Models\StockAdjustment;
use App\Events\TenantResourceChanged;
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
        $this->broadcast($a, 'created');
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
        $this->broadcast($a, 'deleted');
    }

    private function broadcast(StockAdjustment $a, string $action): void
    {
        if (! $a->tenant_id) return;
        try {
            event(new TenantResourceChanged((string) $a->tenant_id, 'stock_adjustments', $action, (string) $a->id));
        } catch (\Throwable) {}
    }
}