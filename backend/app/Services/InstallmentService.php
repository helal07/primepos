<?php

namespace App\Services;

use App\Models\InstallmentSchedule;

class InstallmentService
{
    /**
     * Recalculate paid amount + status for a schedule row after a collection.
     */
    public function recalcSchedule(string $scheduleId, float $newlyPaid): void
    {
        /** @var InstallmentSchedule|null $row */
        $row = InstallmentSchedule::query()->withoutGlobalScopes()->find($scheduleId);
        if (! $row) return;

        $paid = (float) ($row->amount_paid ?? 0) + $newlyPaid;
        $due  = (float) ($row->amount_due ?? 0);

        $status = 'pending';
        if ($paid <= 0)         $status = 'pending';
        elseif ($paid < $due)   $status = 'partial';
        elseif ($paid >= $due)  $status = 'paid';

        $row->forceFill([
            'amount_paid' => $paid,
            'status'      => $status,
        ])->saveQuietly();
    }
}