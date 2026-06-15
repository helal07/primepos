<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->string('sku')->nullable()->index();
            $table->string('barcode')->nullable()->index();
            $table->text('description')->nullable();
            $table->uuid('category_id')->nullable()->index();
            $table->uuid('brand_id')->nullable()->index();
            $table->uuid('unit_id')->nullable()->index();
            $table->decimal('purchase_price', 14, 2)->default(0);
            $table->decimal('selling_price', 14, 2)->default(0);
            $table->decimal('tax_percent', 8, 2)->default(0);
            $table->integer('stock_quantity')->default(0);
            $table->integer('alert_quantity')->default(5);
            $table->string('image_url')->nullable();
            $table->json('gallery_urls')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('has_warranty')->default(false);
            $table->integer('warranty_duration')->nullable();
            $table->string('warranty_type')->nullable();
            $table->boolean('serial_tracking')->default(false);
            $table->string('product_type')->default('general');
            $table->boolean('show_on_website')->default(true);
            $table->string('website_slug')->nullable();
            $table->text('website_description')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
            $table->foreign('brand_id')->references('id')->on('brands')->nullOnDelete();
            $table->foreign('unit_id')->references('id')->on('units')->nullOnDelete();
        });
    }

    public function down(): void { Schema::dropIfExists('products'); }
};