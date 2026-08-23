<?php

namespace App\Console\Commands;

use App\Services\TenantBackupService;
use Illuminate\Console\Command;

class TenantBackupExport extends Command
{
    protected $signature = 'tenant:backup-export {tenant_id} {--notes=}';
    protected $description = 'Export a tenant to a .sql.gz mysqldump file.';

    public function handle(TenantBackupService $svc): int
    {
        $backup = $svc->export($this->argument('tenant_id'), null, $this->option('notes'));
        $this->info("Exported: storage/app/private/{$backup->storage_path} ({$backup->size_bytes} bytes)");
        return self::SUCCESS;
    }
}