<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('designation')->nullable();
            $table->string('locale', 8)->default('en');
            $table->json('preferences')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('tenant_id')->references('id')->on('tenants')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};