<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('store_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('store_order_id')->index();
            $table->uuid('product_id')->nullable();
            $table->uuid('variation_id')->nullable();
            $table->string('product_name');
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('quantity', 12, 3)->default(1);
            $table->decimal('line_total', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_order_items');
    }
};
