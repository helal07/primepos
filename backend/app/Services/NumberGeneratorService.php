<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Atomic, tenant-scoped sequential number generator.
 * Uses an UPSERT + SELECT inside a transaction so two concurrent
 * requests never produce the same number.
 */
class NumberGeneratorService
{
    /**
     * @param  string  $kind   invoice|expense|store_order|installment|purchase|transfer|adjustment
     * @param  string  $prefix e.g. "INV-", "EXP-"
     * @param  int     $pad    zero-pad width (default 6)
     * @param  string  $scope  bucket (e.g. "2026" for yearly reset). Use "default" for non-resetting.
     */
    public function next(?string $tenantId, string $kind, string $prefix = '', int $pad = 6, string $scope = 'default'): string
    {
        $value = DB::transaction(function () use ($tenantId, $kind, $scope) {
            // Lock-or-insert pattern. tenant_id may be null for superadmin scope.
            $row = DB::table('number_counters')
                ->where('tenant_id', $tenantId)
                ->where('kind', $kind)
                ->where('scope', $scope)
                ->lockForUpdate()
                ->first();

            if (! $row) {
                DB::table('number_counters')->insert([
                    'id'         => (string) Str::uuid(),
                    'tenant_id'  => $tenantId,
                    'kind'       => $kind,
                    'scope'      => $scope,
                    'value'      => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                return 1;
            }

            $next = (int) $row->value + 1;
            DB::table('number_counters')
                ->where('id', $row->id)
                ->update(['value' => $next, 'updated_at' => now()]);
            return $next;
        });

        return $prefix . str_pad((string) $value, $pad, '0', STR_PAD_LEFT);
    }

    public function nextInvoice(?string $tenantId): string
    {
        return $this->next($tenantId, 'invoice', 'INV-', 6);
    }

    public function nextExpense(?string $tenantId): string
    {
        return $this->next($tenantId, 'expense', 'EXP-', 6);
    }

    public function nextStoreOrder(?string $tenantId): string
    {
        return $this->next($tenantId, 'store_order', 'SO-', 6);
    }

    public function nextInstallment(?string $tenantId): string
    {
        return $this->next($tenantId, 'installment', 'INS-', 6);
    }

    public function nextPurchase(?string $tenantId): string
    {
        return $this->next($tenantId, 'purchase', 'PO-', 6);
    }

    public function nextTransfer(?string $tenantId): string
    {
        return $this->next($tenantId, 'transfer', 'TR-', 6);
    }

    public function nextAdjustment(?string $tenantId): string
    {
        return $this->next($tenantId, 'adjustment', 'ADJ-', 6);
    }
}