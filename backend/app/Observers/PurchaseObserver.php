<?php

namespace App\Observers;

use App\Events\TenantResourceChanged;
use App\Models\Purchase;

class PurchaseObserver
{
    public function created(Purchase $p): void { $this->broadcast($p, 'created'); }
    public function updated(Purchase $p): void { $this->broadcast($p, 'updated'); }
    public function deleted(Purchase $p): void { $this->broadcast($p, 'deleted'); }

    private function broadcast(Purchase $p, string $action): void
    {
        if (! $p->tenant_id) return;
        try {
            event(new TenantResourceChanged((string) $p->tenant_id, 'purchases', $action, (string) $p->id));
        } catch (\Throwable) {
            // best-effort
        }
    }
}