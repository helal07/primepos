<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One-shot importer: reads the NDJSON snapshot produced by
 * scripts/export-supabase.sh and bulk-inserts every row into MySQL using
 * the DB query builder (so model observers + broadcast events do NOT fire).
 *
 *   php artisan app:import-supabase /path/to/supabase-export
 *   php artisan app:import-supabase /path/to/supabase-export --append
 *
 * Behaviour:
 *   - Default: truncates each target table before insert.
 *   - --append: keeps existing rows (assumes UUID PKs won't collide).
 *   - Foreign-key checks are disabled for the duration of the import.
 *   - Any column whose row value is an array/object is JSON-encoded
 *     (Postgres jsonb / text[] → MySQL JSON column).
 *   - Columns that don't exist on the MySQL table are silently dropped.
 */
class ImportSupabaseSnapshot extends Command
{
    protected $signature = 'app:import-supabase {dir : Directory containing *.ndjson} {--append} {--chunk=100}';

    protected $description = 'Import a Supabase NDJSON snapshot into the MySQL database';

    public function handle(): int
    {
        $dir = rtrim($this->argument('dir'), '/');
        if (!is_dir($dir)) {
            $this->error("Directory not found: {$dir}");
            return self::FAILURE;
        }

        $files = glob($dir . '/*.ndjson') ?: [];
        if (!$files) {
            $this->error("No *.ndjson files in {$dir}");
            return self::FAILURE;
        }

        $append = (bool) $this->option('append');
        $chunk  = max(10, (int) $this->option('chunk'));

        $totalInserted = 0;
        $skipped       = [];

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            foreach ($files as $file) {
                $table = basename($file, '.ndjson');

                if (!Schema::hasTable($table)) {
                    $skipped[] = "{$table} (no such table)";
                    continue;
                }

                $columns = array_flip(Schema::getColumnListing($table));

                if (!$append) {
                    DB::table($table)->truncate();
                }

                $batch = [];
                $count = 0;
                $fh = fopen($file, 'r');
                while (($line = fgets($fh)) !== false) {
                    $line = trim($line);
                    if ($line === '') continue;
                    $row = json_decode($line, true);
                    if (!is_array($row)) continue;

                    $clean = [];
                    foreach ($row as $k => $v) {
                        if (!isset($columns[$k])) continue; // drop unknown cols
                        if (is_array($v)) {
                            $clean[$k] = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                        } else {
                            $clean[$k] = $v;
                        }
                    }
                    $batch[] = $clean;
                    $count++;
                    if (count($batch) >= $chunk) {
                        DB::table($table)->insert($batch);
                        $batch = [];
                    }
                }
                fclose($fh);
                if ($batch) {
                    DB::table($table)->insert($batch);
                }

                $this->line(sprintf('  %-32s %5d rows', $table, $count));
                $totalInserted += $count;
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        $this->info("Inserted {$totalInserted} rows across " . count($files) . ' tables.');
        if ($skipped) {
            $this->warn('Skipped: ' . implode(', ', $skipped));
        }
        return self::SUCCESS;
    }
}