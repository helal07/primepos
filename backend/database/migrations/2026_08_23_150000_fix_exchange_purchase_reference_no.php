<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('exchange_purchases')) {
            return;
        }

        // reference_no was NOT NULL with no default, so any insert coming from the
        // frontend (which never sends it) failed with SQLSTATE[HY000] 1364.
        Schema::table('exchange_purchases', function (Blueprint $table) {
            $table->string('reference_no')->nullable()->change();
        });
    }

    public function down(): void
    {
        // keep nullable
    }
};
