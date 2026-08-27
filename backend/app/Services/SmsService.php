<?php

namespace App\Services;

use App\Models\SmsProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends SMS through the tenant's configured gateway (sms_providers), falling
 * back to a platform-wide provider row and finally to config('services.sms').
 */
class SmsService
{
    public function send(string $tenantId, string $phone, string $message): bool
    {
        $cfg = $this->resolveConfig($tenantId);

        if (empty($cfg['url'])) {
            Log::info('sms.skipped_no_provider', ['tenant' => $tenantId, 'phone' => $phone]);
            return false;
        }

        $replacements = [
            '{to}'      => $phone,
            '{phone}'   => $phone,
            '{message}' => $message,
            '{msg}'     => $message,
            '{sender}'  => (string) ($cfg['sender_id'] ?? ''),
            '{api_key}' => (string) ($cfg['key'] ?? ''),
        ];

        $url = str_replace(array_keys($replacements), array_map('rawurlencode', array_values($replacements)), $cfg['url']);

        try {
            // A templated URL means the gateway is a plain GET endpoint.
            if ($url !== $cfg['url']) {
                $r = Http::timeout(15)->get($url);
            } else {
                $r = Http::timeout(15)->asJson()->post($cfg['url'], array_filter([
                    'api_key'   => $cfg['key'] ?? null,
                    'api_secret'=> $cfg['secret'] ?? null,
                    'senderid'  => $cfg['sender_id'] ?? null,
                    'to'        => $phone,
                    'msg'       => $message,
                    'message'   => $message,
                ], fn ($v) => $v !== null && $v !== ''));
            }

            if (! $r->successful()) {
                Log::warning('sms.rejected', ['status' => $r->status(), 'body' => mb_substr($r->body(), 0, 500)]);
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            Log::warning('sms.failed', ['err' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * @return array{url:?string,key:?string,secret:?string,sender_id:?string}
     */
    private function resolveConfig(string $tenantId): array
    {
        $provider = null;

        try {
            $provider = SmsProvider::query()
                ->where('is_active', true)
                ->where(fn ($q) => $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id'))
                ->orderByRaw('CASE WHEN tenant_id IS NULL THEN 1 ELSE 0 END')
                ->orderByDesc('is_default')
                ->first();
        } catch (\Throwable $e) {
            Log::warning('sms.provider_lookup_failed', ['err' => $e->getMessage()]);
        }

        $raw = [];
        if ($provider) {
            $conf = $provider->config;
            if (is_string($conf)) $conf = json_decode($conf, true);
            $raw = is_array($conf) ? $conf : [];
        }

        return [
            'url'       => $raw['url'] ?? $raw['base_url'] ?? $provider?->base_url ?? config('services.sms.url'),
            'key'       => $raw['api_key'] ?? $provider?->api_key ?? config('services.sms.key'),
            'secret'    => $raw['api_secret'] ?? $provider?->api_secret ?? null,
            'sender_id' => $raw['sender_id'] ?? $raw['senderid'] ?? $provider?->sender_id ?? null,
        ];
    }
}
