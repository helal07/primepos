<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sidebar_permission_audit', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('role_id')->nullable();
            $table->uuid('user_id')->nullable();
            $table->string('module');
            $table->string('action');
            $table->string('change_type');
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->uuid('changed_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sidebar_permission_audit');
    }
};
