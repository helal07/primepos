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
        $this->stock->transfer(
            $t->tenant_id, $t->from_warehouse_id, $t->to_warehouse_id,
            $t->product_id, $t->variation_id, (float) $t->quantity
        );
    }

    public function updated(StockTransfer $t): void
    {
        $oldStatus = $t->getOriginal('status');
        if ($oldStatus !== 'completed' && $t->status === 'completed') {
            $this->stock->transfer(
                $t->tenant_id, $t->from_warehouse_id, $t->to_warehouse_id,
                $t->product_id, $t->variation_id, (float) $t->quantity
            );
        }
    }
}