<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('from_warehouse_id')->index();
            $table->uuid('to_warehouse_id')->index();
            $table->uuid('product_id')->index();
            $table->uuid('variation_id')->nullable();
            $table->decimal('quantity', 14, 3)->default(0);
            $table->string('reference_number')->nullable();
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->date('transfer_date')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('stock_transfers'); }
};