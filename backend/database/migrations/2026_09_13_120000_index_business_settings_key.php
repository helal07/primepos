<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `business_settings.key` is a TEXT column, so lookups by key were full table
 * scans. Add a prefix index on (key, tenant_id) to keep settings reads/writes
 * fast as the table grows with per-tenant rows.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('business_settings') || ! Schema::hasColumn('business_settings', 'key')) {
            return;
        }

        $driver = DB::connection()->getDriverName();
        if ($driver !== 'mysql' && $driver !== 'mariadb') {
            return;
        }

        $exists = DB::selectOne(
            "SELECT 1 AS ok FROM information_schema.statistics
             WHERE table_schema = DATABASE() AND table_name = 'business_settings'
               AND index_name = 'business_settings_key_tenant_idx' LIMIT 1"
        );
        if ($exists) {
            return;
        }

        DB::statement(
            'CREATE INDEX business_settings_key_tenant_idx
             ON business_settings (`key`(64), tenant_id)'
        );
    }

    public function down(): void
    {
        // Index-only migration; intentionally not reversed.
    }
};
