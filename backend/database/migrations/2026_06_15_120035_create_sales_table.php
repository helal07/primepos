<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('invoice_number')->index();
            $table->uuid('customer_id')->nullable()->index();
            $table->uuid('warehouse_id')->nullable()->index();
            $table->uuid('exchange_purchase_id')->nullable();
            $table->timestamp('sale_date')->useCurrent();
            $table->string('status')->default('completed');
            $table->string('source')->default('regular');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->string('discount_type')->default('fixed')->nullable();
            $table->decimal('discount_value', 14, 2)->default(0);
            $table->decimal('discount_amount', 14, 2)->default(0);
            $table->decimal('tax_amount', 14, 2)->default(0);
            $table->decimal('shipping_cost', 14, 2)->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->string('payment_method')->default('cash')->nullable();
            $table->string('payment_status')->default('paid');
            $table->integer('pay_term_number')->nullable();
            $table->string('pay_term_unit')->nullable();
            $table->string('order_no')->nullable();
            $table->string('attach_document_url')->nullable();
            $table->text('shipping_details')->nullable();
            $table->text('shipping_address')->nullable();
            $table->string('shipping_status')->nullable();
            $table->string('delivered_to')->nullable();
            $table->uuid('delivery_person_id')->nullable();
            $table->text('shipping_documents_url')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('sales'); }
};