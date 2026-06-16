<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SpaController extends Controller
{
    public function index(): BinaryFileResponse|JsonResponse
    {
        if (file_exists(public_path('index.html'))) {
            return response()->file(public_path('index.html'));
        }

        return response()->json([
            'app' => config('app.name'),
            'status' => 'ok',
            'time' => now()->toIso8601String(),
        ]);
    }

    public function fallback(): BinaryFileResponse
    {
        abort_unless(file_exists(public_path('index.html')), 404);

        return response()->file(public_path('index.html'));
    }
}