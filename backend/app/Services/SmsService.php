<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Stub SMS gateway dispatcher. Real provider credentials live in
 * sms_providers + tenant config. Wire up provider HTTP call here.
 */
class SmsService
{
    public function send(string $tenantId, string $phone, string $message): bool
    {
        $url = config('services.sms.url');
        $key = config('services.sms.key');

        if (! $url || ! $key) {
            Log::info('sms.skipped', compact('tenantId', 'phone'));
            return false;
        }

        try {
            $r = Http::asJson()->post($url, [
                'api_key' => $key,
                'to'      => $phone,
                'msg'     => $message,
            ]);
            return $r->successful();
        } catch (\Throwable $e) {
            Log::warning('sms.failed', ['err' => $e->getMessage()]);
            return false;
        }
    }
}