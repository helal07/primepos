<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('supplier_id')->nullable()->index();
            $table->date('order_date');
            $table->date('expected_date')->nullable();
            $table->string('reference_number')->default('');
            $table->string('status')->default('draft');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->nullOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('purchase_orders'); }
};