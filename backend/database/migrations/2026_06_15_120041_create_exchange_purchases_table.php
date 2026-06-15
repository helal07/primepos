<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('exchange_purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('reference_no')->index();
            $table->uuid('supplier_customer_id')->nullable()->index();
            $table->string('supplier_name')->nullable();
            $table->string('supplier_phone')->nullable();
            $table->string('supplier_nid')->nullable();
            $table->text('supplier_address')->nullable();
            $table->uuid('warehouse_id')->nullable()->index();
            $table->uuid('product_id')->nullable()->index();
            $table->string('imei_serial')->nullable()->index();
            $table->decimal('purchase_price', 14, 2)->default(0);
            $table->decimal('selling_price', 14, 2)->default(0);
            $table->string('condition')->nullable();
            $table->json('media_urls')->nullable();
            $table->string('agreement_url')->nullable();
            $table->string('status')->default('available');
            $table->uuid('sale_id')->nullable();
            $table->timestamp('purchase_date')->useCurrent();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_purchases');
    }
};
