<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(protected NotificationService $svc) {}

    public function send(Request $request): JsonResponse
    {
        $auth = $request->user();
        abort_unless($auth->isSuperadmin() || $auth->hasRole('tenant_admin'), 403);

        $data = $request->validate([
            'tenant_id' => ['required', 'uuid'],
            'type'      => ['required', 'string'],
            'title'     => ['required', 'string', 'max:200'],
            'message'   => ['required', 'string'],
            'data'      => ['nullable', 'array'],
            'email'     => ['nullable', 'email'],
            'phone'     => ['nullable', 'string'],
        ]);

        $n = $this->svc->send(
            $data['tenant_id'], $data['type'], $data['title'], $data['message'],
            $data['data'] ?? [], $data['email'] ?? null, $data['phone'] ?? null,
        );

        return response()->json(['notification' => $n], 201);
    }
}