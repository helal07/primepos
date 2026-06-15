<?php

namespace App\Console\Commands;

use App\Services\TenantBackupService;
use Illuminate\Console\Command;

class TenantBackupRestore extends Command
{
    protected $signature = 'tenant:backup-restore {tenant_id} {file}';
    protected $description = 'Restore a tenant from a .sql.gz file. Auto-snapshot before restore.';

    public function handle(TenantBackupService $svc): int
    {
        $svc->restore($this->argument('tenant_id'), $this->argument('file'));
        $this->info('Restore complete.');
        return self::SUCCESS;
    }
}