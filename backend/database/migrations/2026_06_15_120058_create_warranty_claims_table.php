<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('warranty_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('claim_no')->index();
            $table->uuid('warranty_id')->index();
            $table->date('claim_date');
            $table->text('issue_description');
            $table->string('status')->default('open');
            $table->string('resolution_type')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->json('attachment_urls')->nullable();
            $table->date('resolved_date')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warranty_claims');
    }
};
