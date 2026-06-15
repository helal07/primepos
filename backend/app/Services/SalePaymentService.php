<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\SalePayment;

class SalePaymentService
{
    /**
     * Recalculate paid_amount and payment_status for a sale.
     * Mirrors Supabase `recalc_sale_payment_status` trigger.
     */
    public function recalc(string $saleId): void
    {
        /** @var Sale|null $sale */
        $sale = Sale::query()->withoutGlobalScopes()->find($saleId);
        if (! $sale) return;

        $paid = (float) SalePayment::query()
            ->withoutGlobalScopes()
            ->where('sale_id', $saleId)
            ->sum('amount');

        $total = (float) $sale->total_amount;

        $status = 'pending';
        if ($paid <= 0)            $status = 'pending';
        elseif ($paid < $total)    $status = 'partial';
        elseif ($paid >= $total)   $status = 'paid';

        $sale->forceFill([
            'payment_status' => $status,
        ])->saveQuietly();
    }
}