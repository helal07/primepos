<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Global (tenant_id NULL) key/value settings for superadmin: SMTP, SMS,
 * notification/email templates and landing CMS blocks.
 *
 * Reads and writes are superadmin-only and hit a single row directly, so
 * saving is one fast query instead of a list-then-write round trip.
 */
class SaasSettingController extends Controller
{
    public function show(Request $request, string $key): JsonResponse
    {
        abort_unless($request->user()->isSuperadmin(), 403);

        $row = BusinessSetting::query()
            ->whereNull('tenant_id')
            ->where('key', $key)
            ->first();

        return response()->json(['value' => $row?->value]);
    }

    public function upsert(Request $request, string $key): JsonResponse
    {
        abort_unless($request->user()->isSuperadmin(), 403);

        $data = $request->validate([
            'value' => ['present', 'array'],
        ]);

        $row = BusinessSetting::query()
            ->whereNull('tenant_id')
            ->where('key', $key)
            ->first();

        if ($row) {
            $row->forceFill(['value' => $data['value']])->save();
        } else {
            BusinessSetting::create([
                'id'        => (string) Str::uuid(),
                'tenant_id' => null,
                'key'       => $key,
                'value'     => $data['value'],
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
