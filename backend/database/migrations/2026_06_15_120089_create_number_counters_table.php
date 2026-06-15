<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('number_counters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('kind', 64);   // invoice, expense, store_order, installment, purchase, transfer, adjustment
            $table->string('scope', 64)->default('default'); // optional year/month bucket
            $table->unsignedBigInteger('value')->default(0);
            $table->timestamps();
            $table->unique(['tenant_id', 'kind', 'scope'], 'nc_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('number_counters');
    }
};