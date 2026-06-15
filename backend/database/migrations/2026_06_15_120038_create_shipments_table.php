<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('sale_id')->nullable()->index();
            $table->string('provider')->nullable();
            $table->string('tracking_id')->nullable()->index();
            $table->string('consignment_id')->nullable();
            $table->string('status')->default('pending');
            $table->string('recipient_name')->nullable();
            $table->string('recipient_phone')->nullable();
            $table->text('recipient_address')->nullable();
            $table->string('recipient_city')->nullable();
            $table->string('recipient_zone')->nullable();
            $table->string('recipient_area')->nullable();
            $table->decimal('amount_to_collect', 14, 2)->default(0);
            $table->decimal('delivery_fee', 14, 2)->default(0);
            $table->decimal('weight', 8, 2)->nullable();
            $table->integer('item_quantity')->default(1);
            $table->text('item_description')->nullable();
            $table->text('special_instruction')->nullable();
            $table->json('provider_response')->nullable();
            $table->timestamp('picked_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('sale_id')->references('id')->on('sales')->nullOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('shipments'); }
};