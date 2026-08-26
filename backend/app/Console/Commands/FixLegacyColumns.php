<?php

namespace App\Console\Commands;

use App\Support\LegacySchemaRelaxer;
use Illuminate\Console\Command;

class FixLegacyColumns extends Command
{
    protected $signature = 'app:fix-legacy-columns {--dry-run : Only report the columns that would change}';

    protected $description = 'Relax legacy NOT NULL columns that have no default value (fixes "Field ... doesn\'t have a default value" errors).';

    public function handle(LegacySchemaRelaxer $relaxer): int
    {
        $changes = $relaxer->run((bool) $this->option('dry-run'));

        if (! $changes) {
            $this->info('No legacy columns to fix.');

            return self::SUCCESS;
        }

        $this->info(count($changes).' legacy column(s) '.($this->option('dry-run') ? 'would be' : 'were').' fixed:');
        foreach ($changes as $change) {
            $this->line("  - {$change}");
        }

        return self::SUCCESS;
    }
}
