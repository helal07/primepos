<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * The database was originally created for Postgres, where many columns were
 * declared NOT NULL and filled by triggers / defaults that do not exist on
 * MySQL. Every insert into such a table fails with:
 *
 *   SQLSTATE[HY000]: 1364 Field 'xxx' doesn't have a default value
 *
 * Instead of patching one table at a time, this helper sweeps the entire
 * schema: any NOT NULL column that has no default and is not a primary key /
 * auto-increment / generated column is either given a sane default (numeric,
 * boolean, json, date-time) or made nullable.
 *
 * It is fully idempotent, so it can run on every deploy.
 */
class LegacySchemaRelaxer
{
    /** Columns that must stay strict – identity, ownership and audit trails. */
    private const PROTECTED_COLUMNS = [
        'id',
        'uuid',
        'password',
        'email',
        'remember_token',
    ];

    /** Tables owned by the framework / auth stack – leave them alone. */
    private const PROTECTED_TABLES = [
        'migrations',
        'password_reset_tokens',
        'password_resets',
        'personal_access_tokens',
        'sessions',
        'cache',
        'cache_locks',
        'jobs',
        'job_batches',
        'failed_jobs',
    ];

    /**
     * @return array<int, string> human readable list of applied changes
     */
    public function run(bool $dryRun = false): array
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return [];
        }

        $changes = [];

        foreach ($this->candidateColumns() as $col) {
            $table = $col->TABLE_NAME;
            $name = $col->COLUMN_NAME;

            if (in_array($table, self::PROTECTED_TABLES, true)) {
                continue;
            }
            if (in_array($name, self::PROTECTED_COLUMNS, true)) {
                continue;
            }

            $sql = $this->statementFor($col);
            if (! $sql) {
                continue;
            }

            $changes[] = "{$table}.{$name}";

            if ($dryRun) {
                continue;
            }

            try {
                DB::statement($sql);
            } catch (\Throwable $e) {
                array_pop($changes);
                $changes[] = "{$table}.{$name} (skipped: {$e->getMessage()})";
            }
        }

        return $changes;
    }

    /** All NOT NULL columns without a default, excluding keys / generated cols. */
    private function candidateColumns(): array
    {
        return DB::select(
            "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, DATA_TYPE, COLUMN_KEY, EXTRA
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND IS_NULLABLE = 'NO'
               AND COLUMN_DEFAULT IS NULL
               AND EXTRA NOT LIKE '%auto_increment%'
               AND EXTRA NOT LIKE '%GENERATED%'
               AND COLUMN_KEY <> 'PRI'
             ORDER BY TABLE_NAME, ORDINAL_POSITION"
        );
    }

    private function statementFor(object $col): ?string
    {
        $table = $col->TABLE_NAME;
        $name = $col->COLUMN_NAME;
        $type = $col->COLUMN_TYPE;
        $data = strtolower($col->DATA_TYPE);

        $quoted = "ALTER TABLE `{$table}` MODIFY `{$name}` {$type}";

        // created_at / updated_at keep NOT NULL but gain a timestamp default.
        if (in_array($name, ['created_at', 'updated_at'], true)) {
            return "{$quoted} NOT NULL DEFAULT CURRENT_TIMESTAMP";
        }

        if ($data === 'tinyint' && str_contains(strtolower($type), 'tinyint(1)')) {
            return "{$quoted} NOT NULL DEFAULT 0";
        }

        if (in_array($data, ['int', 'bigint', 'smallint', 'mediumint', 'tinyint', 'decimal', 'double', 'float', 'numeric'], true)) {
            // Foreign keys must stay nullable rather than default to 0.
            return str_ends_with($name, '_id')
                ? "{$quoted} NULL"
                : "{$quoted} NOT NULL DEFAULT 0";
        }

        if (in_array($data, ['json'], true)) {
            return "{$quoted} NULL";
        }

        // text / blob columns cannot carry a default on MySQL – make nullable.
        if (str_contains($data, 'text') || str_contains($data, 'blob')) {
            return "{$quoted} NULL";
        }

        if (in_array($data, ['varchar', 'char', 'enum', 'date', 'datetime', 'timestamp', 'time', 'year'], true)) {
            return "{$quoted} NULL";
        }

        return "{$quoted} NULL";
    }
}
