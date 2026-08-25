<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentAttempt;
use App\Models\PaymentGateway;
use App\Models\SaasPackage;
use App\Models\TenantPayment;
use App\Services\NotificationService;
use App\Services\Payments\PaymentGatewayResolver;
use App\Services\TenantSubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentGatewayResolver $gateways,
        protected TenantSubscriptionService $subs,
        protected NotificationService $notifier,
    ) {}

    /** Start a gateway checkout for the authenticated tenant. */
    public function init(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'package_id'        => ['required', 'uuid'],
            'subscription_type' => ['nullable', 'in:monthly,yearly'],
            'gateway'           => ['required', 'string'],
            'from'              => ['nullable', 'string'],
        ]);

        $code = strtolower($data['gateway']);
        $gw   = PaymentGateway::query()->where('code', $code)->first();
        if (! $gw || ! ($gw->active ?? false)) {
            return response()->json(['message' => 'This payment gateway is not available.'], 422);
        }

        $package = SaasPackage::findOrFail($data['package_id']);
        $type    = $data['subscription_type'] ?? 'monthly';
        $amount  = $type === 'yearly'
            ? (float) ($package->yearly_price ?? $package->price * 12)
            : (float) $package->price;

        if ($amount <= 0) {
            return response()->json(['message' => 'This package does not require payment.'], 422);
        }

        $payment = TenantPayment::query()->withoutGlobalScopes()->create([
            'id'                => (string) Str::uuid(),
            'tenant_id'         => $user->tenant_id,
            'package_id'        => $package->id,
            'subscription_type' => $type,
            'amount'            => $amount,
            'currency'          => 'BDT',
            'gateway'           => $code,
            'payment_method'    => $code,
            'status'            => 'pending',
            'notes'             => $data['from'] ?? null,
            'created_by'        => $user->id,
        ]);

        $callback = url('/api/payments/callback/' . $code);

        try {
            $r = $this->gateways->resolve($code)->initiate($payment, $callback);
        } catch (Throwable $e) {
            $payment->forceFill(['status' => 'failed'])->saveQuietly();
            Log::warning('payment init failed', ['gateway' => $code, 'error' => $e->getMessage()]);
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $payment->forceFill(['gateway_payment_id' => $r['gateway_payment_id']])->saveQuietly();

        return response()->json([
            'payment_id'   => $payment->id,
            'url'          => $r['redirect_url'],
            'redirect_url' => $r['redirect_url'],
        ]);
    }

    /** Public gateway callback / IPN. Verified server-side before activation. */
    public function callback(Request $request, string $gateway): RedirectResponse
    {
        $payload = $request->all();

        PaymentAttempt::query()->withoutGlobalScopes()->create([
            'id'          => (string) Str::uuid(),
            'gateway'     => $gateway,
            'raw_payload' => $payload,
        ]);

        try {
            $impl = $this->gateways->resolve($gateway);
        } catch (Throwable) {
            return $this->back('failed');
        }

        $paymentId = $impl->extractPaymentId($payload);
        $payment   = $paymentId
            ? TenantPayment::query()->withoutGlobalScopes()->find($paymentId)
            : null;

        if (! $payment) return $this->back('failed');

        // Idempotency: a repeated callback must never extend a subscription twice.
        if ($payment->status === 'completed') return $this->back('success', $payment->id);

        try {
            $ok = $impl->verifyCallback($payload, $payment);
        } catch (Throwable $e) {
            Log::warning('payment verify error', ['payment' => $payment->id, 'error' => $e->getMessage()]);
            $ok = false;
        }

        if (! $ok) {
            $payment->forceFill(['status' => 'failed', 'gateway_response' => $payload])->saveQuietly();
            return $this->back('failed');
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

        return $this->back('success', $payment->id);
    }

    protected function back(string $status, ?string $ref = null): RedirectResponse
    {
        $q = ['payment' => $status];
        if ($ref) $q['ref'] = $ref;
        return redirect()->to('/subscription?' . http_build_query($q));
    }

    /** Manual approval by superadmin (offline / bank transfers). */
    public function superApprove(Request $request, string $paymentId): JsonResponse
    {
        abort_unless($request->user()->isSuperadmin(), 403);

        $payment = TenantPayment::query()->withoutGlobalScopes()->findOrFail($paymentId);
        if ($payment->status !== 'completed') {
            $payment->forceFill(['status' => 'completed', 'paid_at' => now()])->saveQuietly();
            $tenant = $this->subs->activate($payment);
        } else {
            $tenant = $payment->tenant;
        }

        return response()->json(['ok' => true, 'tenant' => $tenant]);
    }
}
