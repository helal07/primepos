<?php

namespace App\Services\Payments;

use App\Models\TenantPayment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * EPS (Electronic Payment Switch) — hosted checkout with hash-verified callback.
 */
class EpsGateway implements PaymentGatewayInterface
{
    public function __construct(protected GatewayConfig $cfg) {}

    protected function baseUrl(): string
    {
        $c = $this->cfg->config('eps');
        if (! empty($c['base_url'])) return rtrim($c['base_url'], '/');

        return $this->cfg->isSandbox('eps')
            ? 'https://sandbox.epsbd.com'
            : 'https://api.epsbd.com';
    }

    public function initiate(TenantPayment $payment, string $callbackUrl): array
    {
        $c = $this->cfg->require('eps', ['merchant_id', 'store_id', 'username', 'password', 'hash_key']);

        $amount = number_format((float) $payment->amount, 2, '.', '');
        $res = Http::asJson()
            ->withBasicAuth($c['username'], $c['password'])
            ->post($this->baseUrl() . '/v1/Payment/GetToken', [
                'merchantId'  => $c['merchant_id'],
                'storeId'     => $c['store_id'],
                'merchantRef' => $payment->id,
                'amount'      => $amount,
                'currency'    => 'BDT',
                'successUrl'  => $callbackUrl,
                'failUrl'     => $callbackUrl,
                'cancelUrl'   => $callbackUrl,
                'hash'        => $this->hash([$c['merchant_id'], $payment->id, $amount], $c['hash_key']),
            ]);

        $url = $res->json('redirectUrl') ?? $res->json('RedirectURL') ?? $res->json('url');
        if (! $url) {
            Log::warning('eps init failed', ['body' => $res->json()]);
            throw new RuntimeException($res->json('message') ?? 'EPS payment initiation failed');
        }

        return [
            'redirect_url'       => $url,
            'gateway_payment_id' => $res->json('transactionId') ?? $res->json('token'),
        ];
    }

    public function verifyCallback(array $payload, TenantPayment $payment): bool
    {
        $status = strtoupper((string) ($payload['status'] ?? $payload['transactionStatus'] ?? ''));
        if (! in_array($status, ['SUCCESS', 'COMPLETED', 'PAID'], true)) return false;

        $c = $this->cfg->require('eps', ['merchant_id', 'hash_key']);

        $sent = (string) ($payload['hash'] ?? $payload['signature'] ?? '');
        $amount = number_format((float) ($payload['amount'] ?? 0), 2, '.', '');
        $expected = $this->hash([$c['merchant_id'], $payment->id, $amount], $c['hash_key']);

        if ($sent === '' || ! hash_equals($expected, $sent)) {
            Log::warning('eps callback hash mismatch', ['payment' => $payment->id]);
            return false;
        }

        return abs((float) $amount - (float) $payment->amount) < 0.5;
    }

    protected function hash(array $parts, string $key): string
    {
        return strtoupper(hash_hmac('sha256', implode('|', $parts), $key));
    }

    public function extractPaymentId(array $payload): ?string
    {
        return $payload['merchantRef'] ?? $payload['merchant_ref'] ?? $payload['p'] ?? null;
    }
}
