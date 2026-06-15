<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cms_media', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('file_name');
            $table->string('file_url');
            $table->string('mime_type')->nullable();
            $table->integer('size_bytes')->default(0);
            $table->string('alt_text')->nullable();
            $table->string('folder')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_media');
    }
};
