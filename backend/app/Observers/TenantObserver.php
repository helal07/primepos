<?php

namespace App\Observers;

use App\Models\Tenant;
use App\Services\WarehouseService;

class TenantObserver
{
    public function __construct(protected WarehouseService $warehouses) {}

    public function created(Tenant $tenant): void
    {
        $this->warehouses->ensureDefault($tenant->id);
    }
}