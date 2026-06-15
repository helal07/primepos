<?php

namespace App\Observers;

use App\Models\Sale;
use App\Services\NumberGeneratorService;
use App\Services\SalePaymentService;

class SaleObserver
{
    public function __construct(
        protected NumberGeneratorService $numbers,
        protected SalePaymentService $payments,
    ) {}

    public function creating(Sale $sale): void
    {
        if (empty($sale->invoice_number) && $sale->tenant_id) {
            $sale->invoice_number = $this->numbers->nextInvoice($sale->tenant_id);
        }
    }

    public function updated(Sale $sale): void
    {
        if ($sale->wasChanged('total_amount')) {
            $this->payments->recalc($sale->id);
        }
    }
}