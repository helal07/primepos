<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('installment_collections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('installment_sale_id')->index();
            $table->uuid('schedule_id')->nullable()->index();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('payment_method')->default('cash');
            $table->string('reference')->nullable();
            $table->timestamp('collected_at')->useCurrent();
            $table->uuid('collected_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installment_collections');
    }
};
