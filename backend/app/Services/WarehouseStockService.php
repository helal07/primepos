<?php

namespace App\Services;

use App\Models\WarehouseStock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Single source of truth for warehouse_stock movements.
 * Always run from inside a DB transaction.
 */
class WarehouseStockService
{
    /**
     * Apply +/- delta to a specific (warehouse, product, variation) cell.
     */
    public function applyDelta(
        string $tenantId,
        string $warehouseId,
        string $productId,
        ?string $variationId,
        float $delta
    ): void {
        if ($delta == 0.0) return;

        $row = WarehouseStock::query()
            ->withoutGlobalScopes()
            ->where('warehouse_id', $warehouseId)
            ->where('product_id', $productId)
            ->where(function ($q) use ($variationId) {
                $variationId === null ? $q->whereNull('variation_id') : $q->where('variation_id', $variationId);
            })
            ->lockForUpdate()
            ->first();

        if (! $row) {
            WarehouseStock::query()->withoutGlobalScopes()->create([
                'id'           => (string) Str::uuid(),
                'tenant_id'    => $tenantId,
                'warehouse_id' => $warehouseId,
                'product_id'   => $productId,
                'variation_id' => $variationId,
                'quantity'     => $delta,
            ]);
            return;
        }

        $row->quantity = ((float) $row->quantity) + $delta;
        $row->save();
    }

    /**
     * Move stock from one warehouse to another.
     */
    public function transfer(
        string $tenantId,
        string $fromWarehouseId,
        string $toWarehouseId,
        string $productId,
        ?string $variationId,
        float $quantity
    ): void {
        if ($quantity <= 0) return;
        DB::transaction(function () use ($tenantId, $fromWarehouseId, $toWarehouseId, $productId, $variationId, $quantity) {
            $this->applyDelta($tenantId, $fromWarehouseId, $productId, $variationId, -$quantity);
            $this->applyDelta($tenantId, $toWarehouseId,   $productId, $variationId,  $quantity);
        });
    }
}