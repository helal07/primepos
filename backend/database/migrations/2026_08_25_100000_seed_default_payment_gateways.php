<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Ensures the three supported SaaS payment gateways exist so the
 * Superadmin > SaaS Settings > Payment Gateways screen is never empty.
 * Idempotent: existing rows (matched by `code`) are left untouched.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('payment_gateways')) {
            return;
        }

        $defaults = [
            ['code' => 'bkash',      'name' => 'bKash Merchant', 'provider' => 'bkash',      'sort_order' => 1],
            ['code' => 'sslcommerz', 'name' => 'SSLCommerz',     'provider' => 'sslcommerz', 'sort_order' => 2],
            ['code' => 'eps',        'name' => 'EPS',            'provider' => 'eps',        'sort_order' => 3],
        ];

        foreach ($defaults as $row) {
            $exists = DB::table('payment_gateways')->where('code', $row['code'])->exists();
            if ($exists) {
                continue;
            }

            $insert = [
                'id'         => (string) Str::uuid(),
                'code'       => $row['code'],
                'provider'   => $row['provider'],
                'sort_order' => $row['sort_order'],
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Column naming differs between the legacy and aligned schema.
            if (Schema::hasColumn('payment_gateways', 'display_name')) $insert['display_name'] = $row['name'];
            if (Schema::hasColumn('payment_gateways', 'name'))         $insert['name'] = $row['name'];
            if (Schema::hasColumn('payment_gateways', 'active'))       $insert['active'] = false;
            if (Schema::hasColumn('payment_gateways', 'is_active'))    $insert['is_active'] = false;
            if (Schema::hasColumn('payment_gateways', 'visible'))      $insert['visible'] = false;
            if (Schema::hasColumn('payment_gateways', 'mode'))         $insert['mode'] = 'sandbox';
            if (Schema::hasColumn('payment_gateways', 'is_sandbox'))   $insert['is_sandbox'] = true;

            DB::table('payment_gateways')->insert($insert);
        }
    }

    public function down(): void
    {
        // Keep gateway rows on rollback — they may hold operator configuration.
    }
};
