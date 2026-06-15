<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sms_purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('plan_id')->nullable();
            $table->integer('sms_count')->default(0);
            $table->integer('sms_used')->default(0);
            $table->decimal('amount_paid', 14, 2)->default(0);
            $table->string('status')->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->uuid('payment_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_purchases');
    }
};
