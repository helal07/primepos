<?php

namespace App\Observers;

use App\Models\InstallmentCollection;
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
    }
}