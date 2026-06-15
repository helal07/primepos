<?php

namespace App\Services\Payments;

use App\Models\TenantPayment;

class EpsGateway implements PaymentGatewayInterface
{
    public function initiate(TenantPayment $payment, string $callbackUrl): array
    {
        return [
            'redirect_url'       => $callbackUrl . '?p=' . $payment->id,
            'gateway_payment_id' => null,
        ];
    }

    public function verifyCallback(array $payload): bool
    {
        return ($payload['status'] ?? null) === 'SUCCESS';
    }

    public function extractPaymentId(array $payload): ?string
    {
        return $payload['merchant_ref'] ?? $payload['p'] ?? null;
    }
}