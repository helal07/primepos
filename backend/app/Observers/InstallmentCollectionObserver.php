<?php

namespace App\Observers;

use App\Models\InstallmentCollection;
use App\Events\TenantResourceChanged;
use App\Services\InstallmentService;

class InstallmentCollectionObserver
{
    public function __construct(protected InstallmentService $svc) {}

    public function created(InstallmentCollection $c): void
    {
        if (! empty($c->installment_schedule_id) || ! empty($c->schedule_id)) {
            $scheduleId = $c->installment_schedule_id ?? $c->schedule_id;
            $this->svc->recalcSchedule($scheduleId, (float) ($c->amount ?? 0));
        }
        $this->broadcast($c, 'created');
    }

    public function updated(InstallmentCollection $c): void { $this->broadcast($c, 'updated'); }
    public function deleted(InstallmentCollection $c): void { $this->broadcast($c, 'deleted'); }

    private function broadcast(InstallmentCollection $c, string $action): void
    {
        if (! $c->tenant_id) return;
        try {
            event(new TenantResourceChanged((string) $c->tenant_id, 'installment_collections', $action, (string) $c->id));
        } catch (\Throwable) {}
    }
}