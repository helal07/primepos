<?php

namespace App\Observers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Services\WarehouseStockService;

class SaleItemObserver
{
    public function __construct(protected WarehouseStockService $stock) {}

    public function created(SaleItem $item): void
    {
        $sale = $this->saleFor($item);
        if (! $sale || ! $sale->warehouse_id) return;
        $this->stock->assertAvailable(
            $sale->warehouse_id, $item->product_id, $item->variation_id,
            (float) $item->quantity
        );
        $this->stock->applyDelta(
            $sale->tenant_id, $sale->warehouse_id,
            $item->product_id, $item->variation_id,
            -1 * (float) $item->quantity
        );
    }

    public function updated(SaleItem $item): void
    {
        $sale = $this->saleFor($item);
        if (! $sale || ! $sale->warehouse_id) return;

        $oldQty = (float) ($item->getOriginal('quantity') ?? 0);
        $newQty = (float) $item->quantity;
        $diff = $newQty - $oldQty;
        if ($diff == 0.0) return;

        $this->stock->applyDelta(
            $sale->tenant_id, $sale->warehouse_id,
            $item->product_id, $item->variation_id,
            -$diff
        );
    }

    public function deleted(SaleItem $item): void
    {
        $sale = $this->saleFor($item);
        if (! $sale || ! $sale->warehouse_id) return;
        $this->stock->applyDelta(
            $sale->tenant_id, $sale->warehouse_id,
            $item->product_id, $item->variation_id,
            (float) $item->quantity
        );
    }

    protected function saleFor(SaleItem $item): ?Sale
    {
        return Sale::query()->withoutGlobalScopes()->find($item->sale_id);
    }
}