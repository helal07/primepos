<?php

namespace App\Services\Payments;

use App\Models\TenantPayment;
use Illuminate\Support\Facades\Http;

class BkashGateway implements PaymentGatewayInterface
{
    public function initiate(TenantPayment $payment, string $callbackUrl): array
    {
        // TODO: real bKash create-payment API call using tenant credentials.
        // Returning the callback URL as a placeholder keeps the flow wired.
        return [
            'redirect_url'       => $callbackUrl . '?p=' . $payment->id,
            'gateway_payment_id' => null,
        ];
    }

    public function verifyCallback(array $payload): bool
    {
        return ($payload['status'] ?? null) === 'Completed'
            || ($payload['transactionStatus'] ?? null) === 'Completed';
    }

    public function extractPaymentId(array $payload): ?string
    {
        return $payload['merchantInvoiceNumber'] ?? $payload['payment_id'] ?? $payload['p'] ?? null;
    }
}