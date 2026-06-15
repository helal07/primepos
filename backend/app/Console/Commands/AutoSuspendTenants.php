<?php

namespace App\Console\Commands;

use App\Services\TenantSubscriptionService;
use Illuminate\Console\Command;

/** Port of `auto_suspend_expired_tenants` PG function. */
class AutoSuspendTenants extends Command
{
    protected $signature = 'tenants:auto-suspend';
    protected $description = 'Suspend tenants whose trial or subscription has expired.';

    public function handle(TenantSubscriptionService $svc): int
    {
        $n = $svc->autoSuspendExpired();
        $this->info("Suspended {$n} expired tenant(s).");
        return self::SUCCESS;
    }
}