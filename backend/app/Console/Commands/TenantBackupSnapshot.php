<?php

namespace App\Console\Commands;

use App\Services\TenantBackupService;
use Illuminate\Console\Command;

class TenantBackupSnapshot extends Command
{
    protected $signature = 'tenant:backup-snapshot {tenant_id}';
    protected $description = 'Take an ad-hoc tenant snapshot (same as backup-export, tagged snapshot).';

    public function handle(TenantBackupService $svc): int
    {
        $backup = $svc->snapshot($this->argument('tenant_id'));
        $this->info("Snapshot: storage/app/private/{$backup->storage_path}");
        return self::SUCCESS;
    }
}