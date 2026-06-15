<?php

namespace App\Services;

use App\Models\Warehouse;
use Illuminate\Support\Str;

class WarehouseService
{
    /**
     * Make sure each tenant has at least one default warehouse.
     * Called from TenantObserver::created.
     */
    public function ensureDefault(string $tenantId): Warehouse
    {
        $existing = Warehouse::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('is_default', true)
            ->first();

        if ($existing) return $existing;

        return Warehouse::query()->withoutGlobalScopes()->create([
            'id'         => (string) Str::uuid(),
            'tenant_id'  => $tenantId,
            'name'       => 'Main Warehouse',
            'code'       => 'MAIN',
            'is_default' => true,
            'is_active'  => true,
        ]);
    }
}