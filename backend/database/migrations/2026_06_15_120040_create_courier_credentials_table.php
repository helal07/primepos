<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('courier_credentials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('provider');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->string('pathao_base_url')->nullable();
            $table->string('pathao_client_id')->nullable();
            $table->string('pathao_client_secret')->nullable();
            $table->string('pathao_username')->nullable();
            $table->string('pathao_password')->nullable();
            $table->string('pathao_store_id')->nullable();
            $table->text('pathao_access_token')->nullable();
            $table->text('pathao_refresh_token')->nullable();
            $table->timestamp('pathao_token_expires_at')->nullable();
            $table->string('steadfast_base_url')->nullable();
            $table->string('steadfast_api_key')->nullable();
            $table->string('steadfast_secret_key')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }
    public function down(): void { Schema::dropIfExists('courier_credentials'); }
};