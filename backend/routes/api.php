<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TenantUserController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\NotificationController;

Route::get('/health', fn () => ['status' => 'ok', 'time' => now()->toIso8601String()]);

Route::prefix('auth')->group(function () {
    Route::post('/login',  [AuthController::class, 'login']);   // SPA cookie session
    Route::post('/token',  [AuthController::class, 'token']);   // bearer token (mobile)

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me',      [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

/*
|--------------------------------------------------------------------------
| Public — tenant self-signup & payment gateway webhooks (no auth)
|--------------------------------------------------------------------------
*/
Route::post('/tenants/signup', [TenantController::class, 'signup']);
Route::any('/payments/callback/{gateway}', [PaymentController::class, 'callback']);
Route::post('/track/event',     [TrackingController::class, 'event']);
Route::post('/track/fb-pixel',  [TrackingController::class, 'fbPixel']);

Route::middleware(['auth:sanctum', 'tenant.active'])->group(function () {
    Route::get('/user', fn (Request $r) => $r->user()->load('tenant'));

    // Tenant user management
    Route::post  ('/tenant-users',                          [TenantUserController::class, 'store']);
    Route::delete('/tenant-users/{userId}',                 [TenantUserController::class, 'destroy']);
    Route::post  ('/tenant-users/{userId}/reset-password',  [TenantUserController::class, 'resetPassword']);

    // Payments
    Route::post('/payments/init',                  [PaymentController::class, 'init']);
    Route::post('/payments/{paymentId}/approve',   [PaymentController::class, 'superApprove']);

    // Notifications
    Route::post('/notifications/send', [NotificationController::class, 'send']);

    // Superadmin tenant create
    Route::post('/admin/tenants', [TenantController::class, 'adminCreate'])
        ->middleware('role:superadmin');
});