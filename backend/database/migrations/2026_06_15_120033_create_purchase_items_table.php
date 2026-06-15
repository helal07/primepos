<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('purchase_id')->index();
            $table->uuid('product_id')->index();
            $table->uuid('variation_id')->nullable();
            $table->integer('quantity')->default(1);
            $table->integer('received_quantity')->default(0);
            $table->decimal('unit_cost', 14, 2)->default(0);
            $table->decimal('discount', 14, 2)->default(0);
            $table->decimal('tax_percent', 8, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->string('serial_number')->nullable()->index();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('purchase_id')->references('id')->on('purchases')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('purchase_items'); }
};