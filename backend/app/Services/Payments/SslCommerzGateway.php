<?php

namespace App\Services\Payments;

use App\Models\TenantPayment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * SSLCommerz (ecommerce initiator + order validation API).
 */
class SslCommerzGateway implements PaymentGatewayInterface
{
    public function __construct(protected GatewayConfig $cfg) {}

    protected function host(): string
    {
        return $this->cfg->isSandbox('sslcommerz')
            ? 'https://sandbox.sslcommerz.com'
            : 'https://securepay.sslcommerz.com';
    }

    public function initiate(TenantPayment $payment, string $callbackUrl): array
    {
        $c = $this->cfg->require('sslcommerz', ['store_id', 'store_passwd']);

        $res = Http::asForm()->post($this->host() . '/gwprocess/v4/api.php', [
            'store_id'      => $c['store_id'],
            'store_passwd'  => $c['store_passwd'],
            'total_amount'  => number_format((float) $payment->amount, 2, '.', ''),
            'currency'      => 'BDT',
            'tran_id'       => $payment->id,
            'success_url'   => $callbackUrl,
            'fail_url'      => $callbackUrl,
            'cancel_url'    => $callbackUrl,
            'ipn_url'       => $callbackUrl,
            'product_name'  => 'POS subscription',
            'product_category' => 'Software',
            'product_profile'  => 'non-physical-goods',
            'cus_name'      => $payment->tenant->name ?? 'Tenant',
            'cus_email'     => $payment->tenant->email ?? 'billing@example.com',
            'cus_phone'     => $payment->tenant->phone ?? '01700000000',
            'cus_add1'      => 'N/A',
            'cus_city'      => 'Dhaka',
            'cus_country'   => 'Bangladesh',
            'shipping_method' => 'NO',
        ]);

        $url = $res->json('GatewayPageURL');
        if (! $url) {
            Log::warning('sslcommerz session failed', ['body' => $res->json()]);
            throw new RuntimeException($res->json('failedreason') ?? 'SSLCommerz session creation failed');
        }

        return [
            'redirect_url'       => $url,
            'gateway_payment_id' => $res->json('sessionkey'),
        ];
    }

    public function verifyCallback(array $payload, TenantPayment $payment): bool
    {
        $status = strtoupper((string) ($payload['status'] ?? ''));
        if (! in_array($status, ['VALID', 'VALIDATED'], true)) return false;

        $valId = $payload['val_id'] ?? null;
        if (! $valId) return false;

        $c = $this->cfg->require('sslcommerz', ['store_id', 'store_passwd']);

        $res = Http::get($this->host() . '/validator/api/validationserverAPI.php', [
            'val_id'       => $valId,
            'store_id'     => $c['store_id'],
            'store_passwd' => $c['store_passwd'],
            'format'       => 'json',
        ]);

        $body = $res->json() ?? [];
        if (! in_array(strtoupper((string) ($body['status'] ?? '')), ['VALID', 'VALIDATED'], true)) {
            Log::warning('sslcommerz validation failed', ['payment' => $payment->id]);
            return false;
        }
        if (($body['tran_id'] ?? null) !== $payment->id) return false;

        $paid = (float) ($body['currency_amount'] ?? $body['amount'] ?? 0);
        return abs($paid - (float) $payment->amount) < 0.5;
    }

    public function extractPaymentId(array $payload): ?string
    {
        return $payload['tran_id'] ?? $payload['p'] ?? null;
    }
}
