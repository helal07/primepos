<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentAttempt;
use App\Models\SaasPackage;
use App\Models\TenantPayment;
use App\Services\NotificationService;
use App\Services\Payments\PaymentGatewayResolver;
use App\Services\TenantSubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentGatewayResolver $gateways,
        protected TenantSubscriptionService $subs,
        protected NotificationService $notifier,
    ) {}

    /** Port of `payment-init`. */
    public function init(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'package_id'        => ['required', 'uuid'],
            'subscription_type' => ['required', 'in:monthly,yearly'],
            'gateway'           => ['required', 'string'],
        ]);

        $package = SaasPackage::findOrFail($data['package_id']);
        $amount  = $data['subscription_type'] === 'yearly'
            ? (float) ($package->yearly_price ?? $package->price * 12)
            : (float) $package->price;

        $payment = TenantPayment::query()->withoutGlobalScopes()->create([
            'id'                => (string) Str::uuid(),
            'tenant_id'         => $user->tenant_id,
            'package_id'        => $package->id,
            'subscription_type' => $data['subscription_type'],
            'amount'            => $amount,
            'gateway'           => $data['gateway'],
            'status'            => 'pending',
        ]);

        $callback = url('/api/payments/callback/' . $data['gateway']);
        $r = $this->gateways->resolve($data['gateway'])->initiate($payment, $callback);

        $payment->forceFill(['gateway_payment_id' => $r['gateway_payment_id']])->saveQuietly();

        return response()->json([
            'payment_id'   => $payment->id,
            'redirect_url' => $r['redirect_url'],
        ]);
    }

    /** Port of `bkash-callback` / `eps-callback`. Public webhook. */
    public function callback(Request $request, string $gateway): Response
    {
        $payload = $request->all();

        PaymentAttempt::query()->withoutGlobalScopes()->create([
            'id'      => (string) Str::uuid(),
            'gateway' => $gateway,
            'payload' => $payload,
        ]);

        $impl = $this->gateways->resolve($gateway);
        $paymentId = $impl->extractPaymentId($payload);
        if (! $paymentId) return response('missing id', 400);

        $payment = TenantPayment::query()->withoutGlobalScopes()->find($paymentId);
        if (! $payment) return response('not found', 404);

        if (! $impl->verifyCallback($payload)) {
            $payment->forceFill(['status' => 'failed', 'gateway_response' => $payload])->saveQuietly();
            return response('failed', 200);
        }

        $payment->forceFill([
            'status'           => 'completed',
            'gateway_response' => $payload,
            'paid_at'          => now(),
        ])->saveQuietly();

        $tenant = $this->subs->activate($payment);
        $this->notifier->send(
            $tenant->id,
            'payment.success',
            'Payment received',
            "Your subscription is active until {$tenant->subscription_end?->toDateString()}.",
            ['payment_id' => $payment->id],
            $tenant->email,
        );

        return response('ok', 200);
    }

    /** Port of `super-approve-payment` — manual approval by superadmin. */
    public function superApprove(Request $request, string $paymentId): JsonResponse
    {
        abort_unless($request->user()->isSuperadmin(), 403);

        $payment = TenantPayment::query()->withoutGlobalScopes()->findOrFail($paymentId);
        $payment->forceFill([
            'status'  => 'completed',
            'paid_at' => now(),
        ])->saveQuietly();

        $tenant = $this->subs->activate($payment);
        return response()->json(['ok' => true, 'tenant' => $tenant]);
    }
}