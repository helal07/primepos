<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payment_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('gateway_id')->nullable();
            $table->string('reference')->index();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('currency', 8)->default('BDT');
            $table->string('status')->default('initiated');
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('purpose')->nullable();
            $table->uuid('related_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_attempts');
    }
};
