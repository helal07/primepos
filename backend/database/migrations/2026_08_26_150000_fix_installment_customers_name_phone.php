<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('installment_customers')) {
            return;
        }

        // Legacy columns were NOT NULL, but the app now links to customers
        // and derives name/phone from the selected customer.
        foreach (['name' => 'varchar(255)', 'phone' => 'varchar(255)'] as $col => $type) {
            if (Schema::hasColumn('installment_customers', $col)) {
                try {
                    DB::statement("ALTER TABLE `installment_customers` MODIFY `{$col}` {$type} NULL");
                } catch (\Throwable) {
                    // non-MySQL drivers / already nullable
                }
            }
        }
    }

    public function down(): void
    {
        // no-op: reverting to NOT NULL could fail on existing rows
    }
};
