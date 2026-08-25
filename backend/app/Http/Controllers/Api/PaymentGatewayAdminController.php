<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentGateway;
use App\Models\PaymentGatewayCredential;
use App\Services\Payments\GatewayConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Superadmin gateway configuration. Secrets are write-only:
 * reads return masked placeholders, and an empty/masked submitted value
 * keeps the previously stored secret.
 */
class PaymentGatewayAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperadmin(), 403);

        $gateways = PaymentGateway::query()->orderBy('sort_order')->get();
        $creds    = PaymentGatewayCredential::query()
            ->whereIn('gateway_id', $gateways->pluck('id'))
            ->get()
            ->keyBy('gateway_id');

        return response()->json([
            'data' => $gateways->map(fn (PaymentGateway $gw) => [
                'id'           => $gw->id,
                'code'         => $gw->code,
                'provider'     => $gw->provider ?? $gw->code,
                'display_name' => $gw->display_name ?? $gw->code,
                'mode'         => $gw->mode ?? 'sandbox',
                'active'       => (bool) ($gw->active ?? false),
                'visible'      => (bool) ($gw->visible ?? false),
                'instructions' => $gw->instructions,
                'config'       => GatewayConfig::mask(
                    is_array($creds[$gw->id]->config ?? null) ? $creds[$gw->id]->config : []
                ),
            ])->values(),
        ]);
    }

    public function update(Request $request, string $gatewayId): JsonResponse
    {
        abort_unless($request->user()->isSuperadmin(), 403);

        $data = $request->validate([
            'display_name' => ['nullable', 'string', 'max:120'],
            'mode'         => ['nullable', 'in:sandbox,live'],
            'active'       => ['nullable', 'boolean'],
            'visible'      => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'string'],
            'config'       => ['nullable', 'array'],
        ]);

        $gw = PaymentGateway::query()->findOrFail($gatewayId);
        $gw->forceFill(array_filter([
            'display_name' => $data['display_name'] ?? null,
            'mode'         => $data['mode'] ?? null,
            'instructions' => $data['instructions'] ?? null,
        ], fn ($v) => $v !== null))->forceFill([
            'active'  => (bool) ($data['active'] ?? false),
            'visible' => (bool) ($data['visible'] ?? false),
        ])->save();

        $row      = PaymentGatewayCredential::query()->where('gateway_id', $gw->id)->first();
        $existing = is_array($row?->config) ? $row->config : [];
        $incoming = $data['config'] ?? [];
        $merged   = $existing;

        foreach ($incoming as $key => $value) {
            $isSecret = in_array($key, GatewayConfig::SECRET_KEYS, true);
            // Blank or masked secret submissions keep the stored value.
            if ($isSecret && (trim((string) $value) === '' || str_starts_with((string) $value, '••'))) continue;
            $merged[$key] = is_string($value) ? trim($value) : $value;
        }

        if ($row) {
            $row->forceFill(['config' => $merged])->save();
        } else {
            PaymentGatewayCredential::create([
                'id'         => (string) Str::uuid(),
                'gateway_id' => $gw->id,
                'config'     => $merged,
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
