<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('installment_sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('invoice_number')->index();
            $table->uuid('customer_id')->index();
            $table->uuid('sale_id')->nullable();
            $table->uuid('warehouse_id')->nullable();
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('down_payment', 14, 2)->default(0);
            $table->decimal('financed_amount', 14, 2)->default(0);
            $table->integer('tenure_months')->default(1);
            $table->decimal('monthly_installment', 14, 2)->default(0);
            $table->decimal('interest_rate', 10, 4)->default(0);
            $table->date('start_date');
            $table->string('status')->default('active');
            $table->string('agreement_url')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installment_sales');
    }
};
