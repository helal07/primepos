<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\TenantPayment;
use Illuminate\Support\Carbon;

/**
 * Port of `activate_tenant_after_payment` PG function.
 */
class TenantSubscriptionService
{
    public function activate(TenantPayment $payment): Tenant
    {
        /** @var Tenant $tenant */
        $tenant = Tenant::query()->withoutGlobalScopes()->findOrFail($payment->tenant_id);

        $type    = $payment->subscription_type ?? $tenant->subscription_type ?? 'monthly';
        $months  = $type === 'yearly' ? 12 : 1;
        $start   = Carbon::today();
        $end     = (clone $start)->addMonths($months);

        $tenant->forceFill([
            'status'             => 'active',
            'subscription_type'  => $type,
            'subscription_start' => $start,
            'subscription_end'   => $end,
        ])->saveQuietly();

        return $tenant;
    }

    /**
     * Mirrors `auto_suspend_expired_tenants`.
     */
    public function autoSuspendExpired(): int
    {
        $today = Carbon::today();
        $expired = Tenant::query()->withoutGlobalScopes()
            ->whereIn('status', ['active', 'trial'])
            ->where(function ($q) use ($today) {
                $q->where(function ($q2) use ($today) {
                    $q2->where('status', 'trial')
                       ->whereNotNull('trial_ends_at')
                       ->where('trial_ends_at', '<', $today);
                })->orWhere(function ($q2) use ($today) {
                    $q2->where('status', 'active')
                       ->whereNotNull('subscription_end')
                       ->where('subscription_end', '<', $today);
                });
            })
            ->get();

        foreach ($expired as $t) {
            $t->forceFill(['status' => 'suspended'])->saveQuietly();
        }

        return $expired->count();
    }
}