<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('domain')->nullable()->unique();
            $table->timestamp('domain_verified_at')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->uuid('owner_user_id')->nullable()->index();
            $table->uuid('package_id')->nullable();
            $table->string('status')->default('trial')->index();
            $table->string('subscription_type')->default('monthly');
            $table->date('subscription_start')->nullable();
            $table->date('subscription_end')->nullable();
            $table->date('trial_ends_at')->nullable();
            $table->json('enabled_modules')->nullable();
            $table->json('branding')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('timezone', 64)->default('Asia/Dhaka');
            $table->string('currency', 8)->default('BDT');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('package_id')->references('id')->on('saas_packages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};