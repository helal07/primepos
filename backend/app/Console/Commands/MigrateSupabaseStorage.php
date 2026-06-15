<?php

namespace App\Console\Commands;

use App\Services\StorageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Downloads every object from the 8 Supabase Storage buckets into the local
 * public_uploads / private_uploads disks. Idempotent — skips existing files.
 *
 *   php artisan storage:migrate-supabase
 *   php artisan storage:migrate-supabase --bucket=avatars
 *   php artisan storage:migrate-supabase --dry-run
 */
class MigrateSupabaseStorage extends Command
{
    protected $signature = 'storage:migrate-supabase
                            {--bucket=* : Limit to specific buckets}
                            {--dry-run : List files without downloading}
                            {--overwrite : Re-download even if file exists}';

    protected $description = 'Download all files from Supabase Storage buckets to local public/private disks';

    public function handle(): int
    {
        $url = rtrim((string) env('SUPABASE_URL'), '/');
        $key = (string) env('SUPABASE_SERVICE_ROLE_KEY');

        if (!$url || !$key) {
            $this->error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required.');
            return self::FAILURE;
        }

        $only = $this->option('bucket') ?: [];
        $buckets = array_merge(StorageService::PUBLIC_BUCKETS, StorageService::PRIVATE_BUCKETS);
        if ($only) {
            $buckets = array_values(array_intersect($buckets, $only));
        }

        $http = Http::withHeaders([
            'Authorization' => "Bearer {$key}",
            'apikey'        => $key,
        ])->timeout(120);

        $totalFiles = 0;
        $totalBytes = 0;

        foreach ($buckets as $bucket) {
            $this->line("");
            $this->info("== Bucket: {$bucket} ==");
            $disk = StorageService::disk($bucket);

            $entries = $this->listAll($http, $url, $bucket, '');
            $this->line("  found ".count($entries)." object(s)");

            foreach ($entries as $key) {
                $localPath = "{$bucket}/{$key}";
                if (!$this->option('overwrite') && $disk->exists($localPath)) {
                    continue;
                }

                if ($this->option('dry-run')) {
                    $this->line("  [dry] {$localPath}");
                    $totalFiles++;
                    continue;
                }

                $resp = $http->get("{$url}/storage/v1/object/{$bucket}/{$key}");
                if (!$resp->ok()) {
                    $this->warn("  ! {$key} (HTTP {$resp->status()})");
                    continue;
                }
                $body = $resp->body();
                $disk->put($localPath, $body);
                $totalFiles++;
                $totalBytes += strlen($body);
                $this->line("  ✓ {$key} (".number_format(strlen($body))." bytes)");
            }
        }

        $this->line("");
        $this->info("Done. Files: {$totalFiles}, Bytes: ".number_format($totalBytes));
        return self::SUCCESS;
    }

    /** Recursively list all object keys under a prefix using Supabase Storage REST. */
    private function listAll($http, string $base, string $bucket, string $prefix): array
    {
        $keys = [];
        $offset = 0;
        $limit  = 1000;

        do {
            $resp = $http->post("{$base}/storage/v1/object/list/{$bucket}", [
                'prefix' => $prefix,
                'limit'  => $limit,
                'offset' => $offset,
                'sortBy' => ['column' => 'name', 'order' => 'asc'],
            ]);
            if (!$resp->ok()) {
                $this->warn("  list failed for '{$prefix}' (HTTP {$resp->status()})");
                break;
            }
            $rows = $resp->json() ?: [];
            foreach ($rows as $row) {
                $name = $row['name'] ?? null;
                if (!$name) continue;
                $full = $prefix === '' ? $name : "{$prefix}/{$name}";

                // Folders have null id (Supabase quirk) → recurse
                if (empty($row['id']) && empty($row['metadata'])) {
                    $keys = array_merge($keys, $this->listAll($http, $base, $bucket, $full));
                } else {
                    $keys[] = $full;
                }
            }
            $offset += count($rows);
        } while (count($rows) === $limit);

        return $keys;
    }
}