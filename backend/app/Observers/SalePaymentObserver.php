<?php

namespace App\Observers;

use App\Models\SalePayment;
use App\Services\SalePaymentService;

class SalePaymentObserver
{
    public function __construct(protected SalePaymentService $svc) {}

    public function created(SalePayment $p): void  { $this->svc->recalc($p->sale_id); }
    public function updated(SalePayment $p): void  { $this->svc->recalc($p->sale_id); }
    public function deleted(SalePayment $p): void  { $this->svc->recalc($p->sale_id); }
}