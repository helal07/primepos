<?php

namespace App\Console\Commands;

use App\Services\StorageService;
use Illuminate\Console\Command;

/**
 * Copies files from the legacy upload roots (storage/app/public, storage/app/private/uploads)
 * into the volume-backed roots (storage/app/uploads/{public,private}).
 *
 * Idempotent and non-destructive: existing destination files are skipped and the
 * legacy files are never deleted, so nothing can be lost if this runs mid-deploy.
 */
class MigrateUploads extends Command
{
    protected $signature = 'app:migrate-uploads {--prune : delete legacy files after a verified copy}';
    protected $description = 'Copy legacy uploads into storage/app/uploads (volume-backed)';

    public function handle(): int
    {
        $buckets = array_merge(StorageService::PUBLIC_BUCKETS, StorageService::PRIVATE_BUCKETS);
        $copied = 0;
        $skipped = 0;

        foreach ($buckets as $bucket) {
            $legacy = StorageService::legacyDisk($bucket);
            $target = StorageService::disk($bucket);

            if (!$legacy->exists($bucket)) {
                continue;
            }

            foreach ($legacy->allFiles($bucket) as $file) {
                if ($target->exists($file)) {
                    $skipped++;
                    continue;
                }
                $stream = $legacy->readStream($file);
                if (!$stream) {
                    continue;
                }
                $target->writeStream($file, $stream);
                if (is_resource($stream)) {
                    fclose($stream);
                }
                $copied++;

                if ($this->option('prune') && $target->exists($file)) {
                    $legacy->delete($file);
                }
            }
        }

        $this->info("Uploads migrated: {$copied} copied, {$skipped} already present.");
        return self::SUCCESS;
    }
}
