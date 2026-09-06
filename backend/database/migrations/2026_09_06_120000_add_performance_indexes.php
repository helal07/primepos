<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Composite indexes for the hot multi-tenant read paths (dashboard, reports,
 * POS lookups, installment due lists). Every query is tenant-scoped, so the
 * leading column is always tenant_id.
 */
return new class extends Migration {
    /** @var array<string, array<int, array<int, string>>> */
    private array $indexes = [
        'sales'                  => [['tenant_id', 'created_at'], ['tenant_id', 'warehouse_id'], ['tenant_id', 'customer_id'], ['tenant_id', 'payment_status']],
        'sale_items'             => [['tenant_id', 'sale_id'], ['tenant_id', 'product_id']],
        'sale_payments'          => [['tenant_id', 'sale_id']],
        'purchases'              => [['tenant_id', 'created_at'], ['tenant_id', 'warehouse_id'], ['tenant_id', 'supplier_id']],
        'purchase_items'         => [['tenant_id', 'purchase_id'], ['tenant_id', 'product_id'], ['tenant_id', 'imei_serial']],
        'products'               => [['tenant_id', 'sku'], ['tenant_id', 'name'], ['tenant_id', 'category_id']],
        'warehouse_stock'        => [['tenant_id', 'warehouse_id', 'product_id']],
        'customers'              => [['tenant_id', 'phone'], ['tenant_id', 'name']],
        'installment_schedules'  => [['tenant_id', 'due_date'], ['tenant_id', 'status'], ['tenant_id', 'installment_sale_id']],
        'installment_sales'      => [['tenant_id', 'created_at'], ['tenant_id', 'status']],
        'installment_customers'  => [['tenant_id', 'nid_number']],
        'installment_collections'=> [['tenant_id', 'collection_date']],
        'transactions'           => [['tenant_id', 'created_at']],
        'expenses'               => [['tenant_id', 'expense_date']],
        'activity_log'           => [['tenant_id', 'created_at']],
        'stock_transfers'        => [['tenant_id', 'transfer_date']],
        'stock_adjustments'      => [['tenant_id', 'created_at']],
        'shipments'              => [['tenant_id', 'status']],
        'warranty_claims'        => [['tenant_id', 'status']],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $sets) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($sets as $columns) {
                $this->addIndex($table, $columns);
            }
        }
    }

    private function addIndex(string $table, array $columns): void
    {
        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return;
            }
        }

        $name = 'idx_'.$table.'_'.implode('_', $columns);
        $name = strlen($name) > 60 ? 'idx_'.substr(md5($name), 0, 24) : $name;

        if ($this->indexExists($table, $name)) {
            return;
        }

        try {
            Schema::table($table, function ($t) use ($columns, $name) {
                $t->index($columns, $name);
            });
        } catch (\Throwable $e) {
            // Duplicate/覆盖 index or unsupported column type — safe to skip.
        }
    }

    private function indexExists(string $table, string $name): bool
    {
        try {
            $prefixed = DB::getTablePrefix().$table;
            return count(DB::select("SHOW INDEX FROM `{$prefixed}` WHERE Key_name = ?", [$name])) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function down(): void
    {
        // Indexes are additive and safe to keep.
    }
};
