<?php

namespace App\Services\Payments;

use App\Models\PaymentGateway;
use App\Models\PaymentGatewayCredential;
use RuntimeException;

/**
 * Loads a gateway row + its (server-side only) credential config.
 * Credentials are never exposed to the client through this class.
 */
class GatewayConfig
{
    /** Keys that must never be returned to the browser. */
    public const SECRET_KEYS = [
        'app_secret', 'password', 'store_passwd', 'store_password',
        'hash_key', 'secret', 'api_secret',
    ];

    public function gateway(string $code): PaymentGateway
    {
        $gw = PaymentGateway::query()->where('code', $code)->first();
        if (! $gw) {
            throw new RuntimeException("Gateway not configured: {$code}");
        }
        return $gw;
    }

    /** @return array<string,mixed> */
    public function config(string $code): array
    {
        $gw  = $this->gateway($code);
        $row = PaymentGatewayCredential::query()->where('gateway_id', $gw->id)->first();
        return is_array($row?->config) ? $row->config : [];
    }

    public function isSandbox(string $code): bool
    {
        $gw = $this->gateway($code);
        return ($gw->mode ?? 'sandbox') !== 'live';
    }

    /** Throws when a required credential is missing so we never build a broken redirect. */
    public function require(string $code, array $keys): array
    {
        $config  = $this->config($code);
        $missing = [];
        foreach ($keys as $k) {
            if (($config[$k] ?? '') === '' || ($config[$k] ?? null) === null) $missing[] = $k;
        }
        if ($missing) {
            throw new RuntimeException(
                "Gateway {$code} is missing credentials: " . implode(', ', $missing)
            );
        }
        return $config;
    }

    /** Strip secrets for safe client display. */
    public static function mask(array $config): array
    {
        $out = [];
        foreach ($config as $k => $v) {
            $out[$k] = in_array($k, self::SECRET_KEYS, true)
                ? (($v === null || $v === '') ? '' : '••••••••')
                : $v;
        }
        return $out;
    }
}
