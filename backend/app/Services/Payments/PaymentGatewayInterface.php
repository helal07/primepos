<?php

namespace App\Services\Payments;

use App\Models\TenantPayment;

interface PaymentGatewayInterface
{
    /** @return array{redirect_url:string, gateway_payment_id:?string} */
    public function initiate(TenantPayment $payment, string $callbackUrl): array;

    /**
     * Verify the callback with the provider (server-to-server where supported)
     * and confirm the amount matches the pending payment.
     */
    public function verifyCallback(array $payload, TenantPayment $payment): bool;

    /** Extract our internal TenantPayment id from callback payload. */
    public function extractPaymentId(array $payload): ?string;
}
