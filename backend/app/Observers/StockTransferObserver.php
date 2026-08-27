<?php

namespace App\Observers;

use App\Models\StockTransfer;
use App\Services\WarehouseStockService;

class StockTransferObserver
{
    public function __construct(protected WarehouseStockService $stock) {}

    public function created(StockTransfer $t): void
    {
        if ($t->status !== 'completed') return;
        $this->move($t);
    }

    public function updated(StockTransfer $t): void
    {
        $oldStatus = $t->getOriginal('status');
        if ($oldStatus !== 'completed' && $t->status === 'completed') {
            $this->move($t);
        }
    }

    /**
     * Guard the source location, then move the stock.
     */
    protected function move(StockTransfer $t): void
    {
        $qty = (float) $t->quantity;
        if ($qty <= 0 || ! $t->from_warehouse_id || ! $t->to_warehouse_id) return;
        if ($t->from_warehouse_id === $t->to_warehouse_id) return;

        $this->stock->assertAvailable(
            $t->from_warehouse_id, $t->product_id, $t->variation_id, $qty
        );

        $this->stock->transfer(
            $t->tenant_id, $t->from_warehouse_id, $t->to_warehouse_id,
            $t->product_id, $t->variation_id, $qty
        );
    }
}
