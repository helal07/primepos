<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The `warranties` table was originally created for ISSUED warranties
 * (warranty_no / start_date / end_date required). The app now uses it to store
 * warranty DEFINITIONS (name + duration + duration_type) that retailers attach
 * to products. Any insert from the UI failed with:
 *   SQLSTATE[HY000] 1364 Field 'warranty_no' doesn't have a default value
 *
 * This migration keeps both shapes valid: legacy issuance columns become
 * nullable, and the definition columns are guaranteed to exist with sane
 * defaults. Products get a nullable warranty_id pointer to the definition.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('warranties')) {
            Schema::table('warranties', function (Blueprint $table) {
                if (! Schema::hasColumn('warranties', 'name')) { $table->string('name')->nullable(); }
                if (! Schema::hasColumn('warranties', 'description')) { $table->text('description')->nullable(); }
                if (! Schema::hasColumn('warranties', 'duration')) { $table->integer('duration')->default(0); }
                if (! Schema::hasColumn('warranties', 'duration_type')) { $table->string('duration_type')->default('months'); }
                if (! Schema::hasColumn('warranties', 'is_active')) { $table->boolean('is_active')->default(true); }
            });

            // Legacy issued-warranty columns must not block definition inserts.
            Schema::table('warranties', function (Blueprint $table) {
                if (Schema::hasColumn('warranties', 'warranty_no')) {
                    $table->string('warranty_no')->nullable()->change();
                }
                if (Schema::hasColumn('warranties', 'start_date')) {
                    $table->date('start_date')->nullable()->change();
                }
                if (Schema::hasColumn('warranties', 'end_date')) {
                    $table->date('end_date')->nullable()->change();
                }
                if (Schema::hasColumn('warranties', 'duration_months')) {
                    $table->integer('duration_months')->nullable()->change();
                }
                if (Schema::hasColumn('warranties', 'status')) {
                    $table->string('status')->nullable()->default('active')->change();
                }
                if (Schema::hasColumn('warranties', 'duration')) {
                    $table->integer('duration')->nullable()->default(0)->change();
                }
                if (Schema::hasColumn('warranties', 'duration_type')) {
                    $table->string('duration_type')->nullable()->default('months')->change();
                }
                if (Schema::hasColumn('warranties', 'is_active')) {
                    $table->boolean('is_active')->nullable()->default(true)->change();
                }
            });
        }

        if (Schema::hasTable('products') && ! Schema::hasColumn('products', 'warranty_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->uuid('warranty_id')->nullable()->index();
            });
        }

        // Claims are created directly against a product/customer in the UI, so
        // the legacy required claim_no / warranty_id must not block inserts.
        if (Schema::hasTable('warranty_claims')) {
            Schema::table('warranty_claims', function (Blueprint $table) {
                if (Schema::hasColumn('warranty_claims', 'claim_no')) {
                    $table->string('claim_no')->nullable()->change();
                }
                if (Schema::hasColumn('warranty_claims', 'warranty_id')) {
                    $table->uuid('warranty_id')->nullable()->change();
                }
            });
        }
    }


    public function down(): void
    {
        // Non-destructive alignment migration; no rollback.
    }
};
