<?php

namespace App\Services\Payments;

use App\Models\TenantPayment;

interface PaymentGatewayInterface
{
    /** @return array{redirect_url:string, gateway_payment_id:?string} */
    public function initiate(TenantPayment $payment, string $callbackUrl): array;

    /** Verify callback payload — return true if payment is confirmed. */
    public function verifyCallback(array $payload): bool;

    /** Extract our internal TenantPayment id from callback payload. */
    public function extractPaymentId(array $payload): ?string;
}