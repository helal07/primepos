<?php

namespace App\Services;

use App\Models\TenantNotification;
use App\Events\TenantNotificationCreated;
use App\Events\UserNotificationCreated;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Port of supabase/functions/send-tenant-notification.
 * Writes to DB + optionally sends email/SMS.
 */
class NotificationService
{
    public function send(
        string $tenantId,
        string $type,
        string $title,
        string $message,
        array $data = [],
        ?string $email = null,
        ?string $phone = null,
        ?string $userId = null,
    ): TenantNotification {
        $notif = TenantNotification::query()->withoutGlobalScopes()->create([
            'id'        => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'user_id'   => $userId,
            'type'      => $type,
            'title'     => $title,
            'message'   => $message,
            'data'      => $data,
        ]);

        // Push the new row to any connected SPA listeners over Reverb.
        // Failures are non-fatal — the SPA also has a poll fallback.
        try {
            event(new TenantNotificationCreated($notif));
            if ($userId) {
                event(new UserNotificationCreated($notif));
            }
        } catch (\Throwable $e) {
            Log::warning('notification.broadcast_failed', ['err' => $e->getMessage()]);
        }

        if ($email) {
            try {
                Mail::raw($message, fn ($m) => $m->to($email)->subject($title));
            } catch (\Throwable $e) {
                Log::warning('notification.email_failed', ['err' => $e->getMessage()]);
            }
        }

        if ($phone) {
            try {
                app(SmsService::class)->send($tenantId, $phone, $message);
            } catch (\Throwable $e) {
                Log::warning('notification.sms_failed', ['err' => $e->getMessage()]);
            }
        }

        return $notif;
    }
}