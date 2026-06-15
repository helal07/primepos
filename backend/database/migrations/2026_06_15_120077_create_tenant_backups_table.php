<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tenant_backups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('file_path');
            $table->string('file_name');
            $table->integer('size_bytes')->default(0);
            $table->string('sha256')->nullable();
            $table->json('row_counts')->nullable();
            $table->string('status')->default('completed');
            $table->uuid('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_backups');
    }
};
