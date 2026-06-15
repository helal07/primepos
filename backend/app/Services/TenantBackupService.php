<?php

namespace App\Services;

use App\Models\TenantBackup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * mysqldump-based per-tenant export/restore. Output is plain `.sql.gz`
 * importable directly via phpMyAdmin or `gunzip | mysql`.
 *
 * No JSON snapshots — native MySQL dump only.
 */
class TenantBackupService
{
    /**
     * Tables that hold tenant_id-scoped rows. FK-safe DELETE order
     * (children before parents) for restore.
     */
    public const TENANT_TABLES = [
        // children → parents
        'sale_payments', 'sale_items', 'sales',
        'purchase_payments', 'purchase_items', 'purchases',
        'purchase_order_items', 'purchase_orders',
        'shipment_status_history', 'shipments', 'courier_credentials',
        'stock_transfers', 'stock_adjustments', 'warehouse_stock',
        'product_group_prices', 'product_variations', 'products',
        'installment_collections', 'installment_schedules', 'installment_sales', 'installment_customers',
        'exchange_purchases',
        'warranty_claims', 'warranties',
        'attendance', 'leave_requests', 'payroll', 'employees',
        'journal_entry_lines', 'journal_entries', 'transactions', 'accounts',
        'expense_payments', 'expenses', 'expense_categories',
        'sms_purchases', 'payment_attempts', 'tenant_payments',
        'tenant_notifications', 'tenant_actions_log', 'activity_log',
        'business_settings', 'sidebar_permission_audit',
        'customers', 'customer_groups', 'suppliers',
        'selling_price_groups', 'variations', 'units', 'categories', 'brands',
        'warehouses', 'branches', 'modules',
        'role_permission_grants', 'role_permissions', 'user_roles', 'roles', 'profiles',
        'trial_reminders_log', 'tenant_backups',
    ];

    public function exportPath(string $tenantId, string $filename): string
    {
        $dir = storage_path("app/private/backups/{$tenantId}");
        if (! is_dir($dir)) mkdir($dir, 0755, true);
        return $dir . '/' . $filename;
    }

    /**
     * Export tenant rows → .sql.gz file (INSERTs only, no schema).
     */
    public function export(string $tenantId, ?string $createdBy = null, ?string $notes = null): TenantBackup
    {
        $db = config('database.connections.mysql');
        $stamp = date('Ymd_His');
        $filename = "{$stamp}.sql.gz";
        $path = $this->exportPath($tenantId, $filename);
        $where = "tenant_id='" . addslashes($tenantId) . "'";

        $tables = implode(' ', array_map('escapeshellarg', self::TENANT_TABLES));

        $cmd = sprintf(
            'mysqldump --host=%s --port=%s --user=%s --password=%s '
            .'--no-create-info --single-transaction --quick '
            .'--skip-triggers --skip-lock-tables --hex-blob '
            .'--where=%s %s %s | gzip > %s',
            escapeshellarg($db['host']),
            escapeshellarg((string)($db['port'] ?? 3306)),
            escapeshellarg($db['username']),
            escapeshellarg($db['password']),
            escapeshellarg($where),
            escapeshellarg($db['database']),
            $tables,
            escapeshellarg($path),
        );

        $p = Process::fromShellCommandline($cmd, null, null, null, 1800);
        $p->run();
        if (! $p->isSuccessful()) {
            throw new RuntimeException('mysqldump failed: ' . $p->getErrorOutput());
        }

        $size = filesize($path) ?: 0;
        $sha  = hash_file('sha256', $path) ?: null;

        return TenantBackup::query()->withoutGlobalScopes()->create([
            'id'          => (string) Str::uuid(),
            'tenant_id'   => $tenantId,
            'file_path'   => "backups/{$tenantId}/{$filename}",
            'file_name'   => $filename,
            'size_bytes'  => $size,
            'sha256'      => $sha,
            'row_counts'  => $this->rowCounts($tenantId),
            'status'      => 'completed',
            'created_by'  => $createdBy,
            'notes'       => $notes,
        ]);
    }

    /**
     * Auto pre-restore snapshot so any accidental restore can be undone.
     */
    public function snapshot(string $tenantId, ?string $createdBy = null): TenantBackup
    {
        return $this->export($tenantId, $createdBy, 'auto pre-restore snapshot');
    }

    /**
     * Restore a tenant from a .sql.gz dump. Atomic:
     *  1) auto-snapshot current state
     *  2) delete current tenant rows (reverse FK order)
     *  3) import the dump
     *  4) on any error → restore the snapshot
     */
    public function restore(string $tenantId, string $absoluteFilePath, ?string $createdBy = null): void
    {
        if (! is_file($absoluteFilePath)) {
            throw new RuntimeException("Backup file not found: {$absoluteFilePath}");
        }

        $snapshot = $this->snapshot($tenantId, $createdBy);

        try {
            $this->deleteTenantRows($tenantId);
            $this->importDump($absoluteFilePath);
        } catch (\Throwable $e) {
            // rollback — re-import the snapshot
            $snapPath = storage_path('app/private/' . $snapshot->file_path);
            $this->deleteTenantRows($tenantId);
            $this->importDump($snapPath);
            throw new RuntimeException('Restore failed, rolled back to snapshot: ' . $e->getMessage(), 0, $e);
        }
    }

    protected function deleteTenantRows(string $tenantId): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            foreach (self::TENANT_TABLES as $t) {
                if (DB::getSchemaBuilder()->hasColumn($t, 'tenant_id')) {
                    DB::table($t)->where('tenant_id', $tenantId)->delete();
                }
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
    }

    protected function importDump(string $absoluteFilePath): void
    {
        $db = config('database.connections.mysql');
        $cmd = sprintf(
            'gunzip -c %s | mysql --host=%s --port=%s --user=%s --password=%s %s',
            escapeshellarg($absoluteFilePath),
            escapeshellarg($db['host']),
            escapeshellarg((string)($db['port'] ?? 3306)),
            escapeshellarg($db['username']),
            escapeshellarg($db['password']),
            escapeshellarg($db['database']),
        );
        $p = Process::fromShellCommandline($cmd, null, null, null, 1800);
        $p->run();
        if (! $p->isSuccessful()) {
            throw new RuntimeException('mysql import failed: ' . $p->getErrorOutput());
        }
    }

    /** @return array<string,int> */
    public function rowCounts(string $tenantId): array
    {
        $out = [];
        foreach (self::TENANT_TABLES as $t) {
            try {
                $out[$t] = (int) DB::table($t)->where('tenant_id', $tenantId)->count();
            } catch (\Throwable) {
                // skip tables without tenant_id or missing
            }
        }
        return $out;
    }

    public function signedDownloadUrl(TenantBackup $backup, int $ttlMinutes = 10): string
    {
        return \URL::temporarySignedRoute(
            'tenant.backups.download',
            now()->addMinutes($ttlMinutes),
            ['backup' => $backup->id],
        );
    }
}