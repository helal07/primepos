<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('warranties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('warranty_no')->index();
            $table->uuid('sale_id')->nullable()->index();
            $table->uuid('sale_item_id')->nullable();
            $table->uuid('product_id')->nullable()->index();
            $table->string('imei_serial')->nullable()->index();
            $table->uuid('customer_id')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('duration_months')->default(12);
            $table->string('status')->default('active');
            $table->text('terms')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warranties');
    }
};
