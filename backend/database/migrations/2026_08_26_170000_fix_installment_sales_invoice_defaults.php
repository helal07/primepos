<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The legacy schema declared invoice number / date columns as NOT NULL without a
 * default (Postgres filled them with a trigger). On MySQL that makes every
 * installment-sale insert fail with "Field doesn't have a default value".
 * Relax them; the model generates the invoice number.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('installment_sales')) return;

        $nullable = [
            'installment_sales'     => ['invoice_no', 'invoice_number', 'sale_date', 'start_date', 'customer_id'],
            'installment_schedules' => ['serial_no', 'installment_no', 'due_date'],
        ];

        foreach ($nullable as $table => $cols) {
            if (! Schema::hasTable($table)) continue;
            foreach ($cols as $col) {
                if (! Schema::hasColumn($table, $col)) continue;
                $type = $this->columnType($table, $col);
                if (! $type) continue;
                try {
                    DB::statement("ALTER TABLE `{$table}` MODIFY `{$col}` {$type} NULL");
                } catch (\Throwable $e) {
                    // ignore – column already nullable or unsupported driver
                }
            }
        }
    }

    private function columnType(string $table, string $col): ?string
    {
        try {
            $row = DB::selectOne(
                'SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
                [$table, $col]
            );
            return $row->t ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function down(): void
    {
        // no-op
    }
};
