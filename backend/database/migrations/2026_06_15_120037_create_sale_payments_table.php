<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sale_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('sale_id')->index();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('payment_method')->default('cash');
            $table->text('payment_note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('sale_id')->references('id')->on('sales')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('sale_payments'); }
};