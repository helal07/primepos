<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('saas_packages', function (Blueprint $table) {
            if (!Schema::hasColumn('saas_packages', 'max_business_location')) {
                $table->integer('max_business_location')->nullable()->after('max_invoices_per_month');
            }
            if (!Schema::hasColumn('saas_packages', 'max_invoice')) {
                $table->integer('max_invoice')->nullable()->after('max_business_location');
            }
            if (!Schema::hasColumn('saas_packages', 'features')) {
                $table->json('features')->nullable()->after('enabled_modules');
            }
            if (!Schema::hasColumn('saas_packages', 'is_popular')) {
                $table->boolean('is_popular')->default(false)->after('is_trial');
            }
            if (!Schema::hasColumn('saas_packages', 'show_on_landing')) {
                $table->boolean('show_on_landing')->default(false)->after('is_popular');
            }
        });
    }

    public function down(): void
    {
        Schema::table('saas_packages', function (Blueprint $table) {
            $table->dropColumn([
                'max_business_location',
                'max_invoice',
                'features',
                'is_popular',
                'show_on_landing',
            ]);
        });
    }
};
