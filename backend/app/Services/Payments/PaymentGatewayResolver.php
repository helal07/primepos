<?php

namespace App\Services\Payments;

use InvalidArgumentException;

class PaymentGatewayResolver
{
    public function resolve(string $code): PaymentGatewayInterface
    {
        return match (strtolower($code)) {
            'bkash' => app(BkashGateway::class),
            'sslcommerz', 'ssl', 'sslcz' => app(SslCommerzGateway::class),
            'eps', 'easypay' => app(EpsGateway::class),
            default => throw new InvalidArgumentException("Unknown gateway: {$code}"),
        };
    }
}
