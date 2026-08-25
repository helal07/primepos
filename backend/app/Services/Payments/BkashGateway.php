<?php

namespace App\Services\Payments;

use App\Models\TenantPayment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * bKash Merchant — Tokenized Checkout (PGW v1.2.0-beta).
 * grant token -> create payment -> customer pays -> execute payment.
 */
class BkashGateway implements PaymentGatewayInterface
{
    public function __construct(protected GatewayConfig $cfg) {}

    protected function baseUrl(): string
    {
        $config = $this->cfg->config('bkash');
        if (! empty($config['base_url'])) return rtrim($config['base_url'], '/');

        return $this->cfg->isSandbox('bkash')
            ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout'
            : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';
    }

    protected function token(): string
    {
        $c = $this->cfg->require('bkash', ['app_key', 'app_secret', 'username', 'password']);

        $res = Http::asJson()->withHeaders([
            'username' => $c['username'],
            'password' => $c['password'],
        ])->post($this->baseUrl() . '/token/grant', [
            'app_key'    => $c['app_key'],
            'app_secret' => $c['app_secret'],
        ]);

        $token = $res->json('id_token');
        if (! $token) {
            Log::warning('bkash token grant failed', ['status' => $res->status()]);
            throw new RuntimeException('bKash authentication failed');
        }
        return $token;
    }

    public function initiate(TenantPayment $payment, string $callbackUrl): array
    {
        $c     = $this->cfg->config('bkash');
        $token = $this->token();

        $res = Http::asJson()->withHeaders([
            'Authorization' => $token,
            'X-App-Key'     => $c['app_key'],
        ])->post($this->baseUrl() . '/create', [
            'mode'                    => '0011',
            'payerReference'          => (string) $payment->tenant_id,
            'callbackURL'             => $callbackUrl,
            'amount'                  => number_format((float) $payment->amount, 2, '.', ''),
            'currency'                => 'BDT',
            'intent'                  => 'sale',
            'merchantInvoiceNumber'   => $payment->id,
        ]);

        $url = $res->json('bkashURL');
        if (! $url) {
            Log::warning('bkash create failed', ['body' => $res->json()]);
            throw new RuntimeException($res->json('statusMessage') ?? 'bKash payment creation failed');
        }

        return [
            'redirect_url'       => $url,
            'gateway_payment_id' => $res->json('paymentID'),
        ];
    }

    public function verifyCallback(array $payload, TenantPayment $payment): bool
    {
        $status    = $payload['status'] ?? null;
        $paymentID = $payload['paymentID'] ?? $payment->gateway_payment_id;
        if (! $paymentID || $status === 'cancel' || $status === 'failure') return false;

        $c     = $this->cfg->config('bkash');
        $token = $this->token();

        $headers = ['Authorization' => $token, 'X-App-Key' => $c['app_key']];

        $res = Http::asJson()->withHeaders($headers)
            ->post($this->baseUrl() . '/execute', ['paymentID' => $paymentID]);

        $body = $res->json() ?? [];

        // Already executed (duplicate callback) — fall back to a query call.
        if (($body['transactionStatus'] ?? null) !== 'Completed') {
            $res  = Http::asJson()->withHeaders($headers)
                ->post($this->baseUrl() . '/payment/status', ['paymentID' => $paymentID]);
            $body = $res->json() ?? [];
        }

        if (($body['transactionStatus'] ?? null) !== 'Completed') {
            Log::warning('bkash execute not completed', ['payment' => $payment->id]);
            return false;
        }

        return $this->amountMatches($body['amount'] ?? null, (float) $payment->amount);
    }

    protected function amountMatches($paid, float $expected): bool
    {
        return $paid !== null && abs(((float) $paid) - $expected) < 0.5;
    }

    public function extractPaymentId(array $payload): ?string
    {
        return $payload['merchantInvoiceNumber'] ?? $payload['payment_id'] ?? $payload['p'] ?? null;
    }
}
