<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shipment_status_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('shipment_id')->index();
            $table->string('status');
            $table->text('remarks')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('shipment_id')->references('id')->on('shipments')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('shipment_status_history'); }
};