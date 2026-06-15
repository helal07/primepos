<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('sale_id')->index();
            $table->uuid('product_id')->index();
            $table->uuid('variation_id')->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('discount', 14, 2)->default(0);
            $table->string('discount_type')->default('fixed')->nullable();
            $table->decimal('tax_percent', 8, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->string('serial_number')->nullable()->index();
            $table->string('imei_text')->nullable();
            $table->string('unit')->nullable();
            $table->uuid('warranty_id')->nullable();
            $table->string('warranty_name')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('sale_id')->references('id')->on('sales')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('sale_items'); }
};