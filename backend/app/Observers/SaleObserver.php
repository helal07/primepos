<?php

namespace App\Observers;

use App\Models\Sale;
use App\Events\TenantResourceChanged;
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
        $this->broadcast($sale, 'updated');
    }

    public function created(Sale $sale): void
    {
        $this->broadcast($sale, 'created');
    }

    public function deleted(Sale $sale): void
    {
        $this->broadcast($sale, 'deleted');
    }

    private function broadcast(Sale $sale, string $action): void
    {
        if (! $sale->tenant_id) return;
        try {
            event(new TenantResourceChanged((string) $sale->tenant_id, 'sales', $action, (string) $sale->id));
        } catch (\Throwable) {
            // broadcasting is best-effort; SPA falls back to its slow poll
        }
    }
}