<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;

Route::get('/health', fn () => ['status' => 'ok', 'time' => now()->toIso8601String()]);

Route::prefix('auth')->group(function () {
    Route::post('/login',  [AuthController::class, 'login']);   // SPA cookie session
    Route::post('/token',  [AuthController::class, 'token']);   // bearer token (mobile)

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me',      [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum', 'tenant.active'])->group(function () {
    Route::get('/user', fn (Request $r) => $r->user()->load('tenant'));
});