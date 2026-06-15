<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class TrackingController extends Controller
{
    /** Port of `track-event` — store any client event. */
    public function event(Request $request): JsonResponse
    {
        $data = $request->validate([
            'event'      => ['required', 'string', 'max:80'],
            'tenant_id'  => ['nullable', 'uuid'],
            'properties' => ['nullable', 'array'],
        ]);

        ActivityLog::query()->withoutGlobalScopes()->create([
            'id'        => (string) Str::uuid(),
            'tenant_id' => $data['tenant_id'] ?? optional($request->user())->tenant_id,
            'user_id'   => optional($request->user())->id,
            'action'    => $data['event'],
            'data'      => $data['properties'] ?? [],
            'ip'        => $request->ip(),
            'user_agent'=> substr((string) $request->userAgent(), 0, 500),
        ]);

        return response()->json(['ok' => true]);
    }

    /** Port of `fb-pixel-proxy` — server-side Facebook Conversions API forward. */
    public function fbPixel(Request $request): JsonResponse
    {
        $pixelId = config('services.facebook.pixel_id');
        $token   = config('services.facebook.access_token');
        if (! $pixelId || ! $token) {
            return response()->json(['ok' => false, 'reason' => 'not_configured'], 200);
        }

        $url = "https://graph.facebook.com/v18.0/{$pixelId}/events?access_token={$token}";
        $r = Http::asJson()->post($url, ['data' => [$request->all()]]);

        return response()->json(['ok' => $r->successful(), 'status' => $r->status()]);
    }
}