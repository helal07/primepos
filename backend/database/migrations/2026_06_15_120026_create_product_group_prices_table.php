<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('product_group_prices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('product_id')->index();
            $table->uuid('variation_id')->nullable()->index();
            $table->uuid('selling_price_group_id')->index();
            $table->decimal('price', 14, 2)->default(0);
            $table->string('price_type')->default('fixed');
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('selling_price_group_id')->references('id')->on('selling_price_groups')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('product_group_prices'); }
};