<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tenant_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('package_id')->nullable();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('currency', 8)->default('BDT');
            $table->string('payment_method');
            $table->string('gateway')->nullable();
            $table->string('transaction_id')->nullable()->index();
            $table->string('status')->default('pending');
            $table->json('gateway_response')->nullable();
            $table->string('proof_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_payments');
    }
};
