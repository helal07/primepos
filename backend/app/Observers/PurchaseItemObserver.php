<?php

namespace App\Observers;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Services\WarehouseStockService;

class PurchaseItemObserver
{
    public function __construct(protected WarehouseStockService $stock) {}

    public function created(PurchaseItem $item): void
    {
        $p = $this->purchaseFor($item);
        if (! $p || ! $p->warehouse_id) return;
        $this->stock->applyDelta(
            $p->tenant_id, $p->warehouse_id,
            $item->product_id, $item->variation_id,
            (float) $item->quantity
        );
    }

    public function updated(PurchaseItem $item): void
    {
        $p = $this->purchaseFor($item);
        if (! $p || ! $p->warehouse_id) return;
        $diff = (float) $item->quantity - (float) ($item->getOriginal('quantity') ?? 0);
        if ($diff == 0.0) return;
        $this->stock->applyDelta(
            $p->tenant_id, $p->warehouse_id,
            $item->product_id, $item->variation_id,
            $diff
        );
    }

    public function deleted(PurchaseItem $item): void
    {
        $p = $this->purchaseFor($item);
        if (! $p || ! $p->warehouse_id) return;
        $this->stock->applyDelta(
            $p->tenant_id, $p->warehouse_id,
            $item->product_id, $item->variation_id,
            -1 * (float) $item->quantity
        );
    }

    protected function purchaseFor(PurchaseItem $item): ?Purchase
    {
        return Purchase::query()->withoutGlobalScopes()->find($item->purchase_id);
    }
}