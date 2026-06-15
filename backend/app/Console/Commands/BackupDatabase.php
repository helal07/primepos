<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

/** Full-database mysqldump for superadmin. */
class BackupDatabase extends Command
{
    protected $signature = 'db:backup';
    protected $description = 'Dump the entire primary database via mysqldump into storage.';

    public function handle(): int
    {
        $dir = storage_path('app/private/system-backups');
        if (! is_dir($dir)) mkdir($dir, 0755, true);
        $file = $dir . '/' . date('Ymd_His') . '.sql.gz';

        $cmd = sprintf(
            'mysqldump --host=%s --user=%s --password=%s --single-transaction --quick --skip-lock-tables --hex-blob %s | gzip > %s',
            escapeshellarg(config('database.connections.mysql.host')),
            escapeshellarg(config('database.connections.mysql.username')),
            escapeshellarg(config('database.connections.mysql.password')),
            escapeshellarg(config('database.connections.mysql.database')),
            escapeshellarg($file),
        );

        $p = Process::fromShellCommandline($cmd, null, null, null, 1800);
        $p->run();

        if (! $p->isSuccessful()) {
            $this->error('mysqldump failed: ' . $p->getErrorOutput());
            return self::FAILURE;
        }

        $this->info("Backup: {$file}");
        return self::SUCCESS;
    }
}