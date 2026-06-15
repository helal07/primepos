<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TrialReminderLog;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Port of supabase/functions/trial-reminders.
 * Sends reminder on D-7, D-3, D-1, and D-0 for trial tenants.
 */
class SendTrialReminders extends Command
{
    protected $signature = 'tenants:send-trial-reminders';
    protected $description = 'Notify trial tenants whose trial is ending soon.';

    public function handle(NotificationService $notifier): int
    {
        $today = Carbon::today();
        $offsets = [7, 3, 1, 0];
        $sent = 0;

        foreach ($offsets as $days) {
            $target = $today->copy()->addDays($days)->toDateString();
            $tenants = Tenant::query()->withoutGlobalScopes()
                ->where('status', 'trial')
                ->whereDate('trial_ends_at', $target)
                ->get();

            foreach ($tenants as $t) {
                $logExists = TrialReminderLog::query()
                    ->where('tenant_id', $t->id)
                    ->where('days_left', $days)
                    ->exists();
                if ($logExists) continue;

                $msg = $days === 0
                    ? 'Your trial ends today. Subscribe now to keep your data accessible.'
                    : "Your trial ends in {$days} day(s). Subscribe to avoid suspension.";

                $notifier->send(
                    $t->id, 'trial.reminder', 'Trial ending soon', $msg,
                    ['days_left' => $days], $t->email,
                );

                TrialReminderLog::create([
                    'id'         => (string) Str::uuid(),
                    'tenant_id'  => $t->id,
                    'days_left'  => $days,
                    'sent_at'    => now(),
                ]);
                $sent++;
            }
        }

        $this->info("Sent {$sent} trial reminder(s).");
        return self::SUCCESS;
    }
}