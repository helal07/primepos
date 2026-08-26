<?php

use App\Support\LegacySchemaRelaxer;
use Illuminate\Database\Migrations\Migration;

/**
 * Schema-wide fix for the recurring MySQL error
 * "Field 'x' doesn't have a default value" (SQLSTATE 1364), caused by columns
 * that were NOT NULL without a default in the original Postgres schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new LegacySchemaRelaxer())->run();
    }

    public function down(): void
    {
        // no-op: relaxing constraints is not reverted automatically.
    }
};
