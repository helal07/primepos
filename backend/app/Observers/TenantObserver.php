<?php

namespace App\Observers;

use App\Models\Tenant;
use App\Services\WarehouseService;
use App\Events\SuperadminEvent;
use Illuminate\Support\Facades\Log;

class TenantObserver
{
    public function __construct(protected WarehouseService $warehouses) {}

    public function created(Tenant $tenant): void
    {
        $this->warehouses->ensureDefault($tenant->id);
        $this->broadcast('tenants', 'created', $tenant->id);
    }

    public function updated(Tenant $tenant): void
    {
        // Surface a focused action when status flips, otherwise a generic update.
        $action = $tenant->wasChanged('status')
            ? ('status:' . (string) $tenant->status)
            : 'updated';
        $this->broadcast('tenants', $action, $tenant->id);
    }

    public function deleted(Tenant $tenant): void
    {
        $this->broadcast('tenants', 'deleted', $tenant->id);
    }

    protected function broadcast(string $resource, string $action, ?string $id): void
    {
        try {
            event(new SuperadminEvent($resource, $action, $id));
        } catch (\Throwable $e) {
            Log::warning('superadmin.broadcast_failed', ['err' => $e->getMessage()]);
        }
    }
}