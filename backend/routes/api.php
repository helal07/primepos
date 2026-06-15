<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TenantUserController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TenantBackupController;
use App\Http\Controllers\Api\FileController;

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

/*
|--------------------------------------------------------------------------
| Signed-URL backup download (no auth — link is short-lived & signed)
|--------------------------------------------------------------------------
*/
Route::get('/tenant-backups/{backup}/download', [TenantBackupController::class, 'download'])
    ->middleware('signed')
    ->name('tenant.backups.download');

/*
|--------------------------------------------------------------------------
| Files — public bucket redirect + signed-URL streaming (no auth required
| when the signature is valid; auth + policy enforced otherwise)
|--------------------------------------------------------------------------
*/
Route::get('/files/{bucket}/{path}', [FileController::class, 'download'])
    ->where('path', '.*')
    ->name('files.download');

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

    // Tenant backups (mysqldump-based)
    Route::get   ('/tenant-backups',                  [TenantBackupController::class, 'index']);
    Route::post  ('/tenant-backups',                  [TenantBackupController::class, 'store']);
    Route::post  ('/tenant-backups/upload',           [TenantBackupController::class, 'upload']);
    Route::post  ('/tenant-backups/{backupId}/restore', [TenantBackupController::class, 'restore']);

    // Files (upload/delete) — bucket-aware, FileAccessPolicy enforced
    Route::post   ('/files/upload',              [FileController::class, 'upload']);
    Route::get    ('/files/sign',                [FileController::class, 'sign']);
    Route::delete ('/files/{bucket}/{path}',     [FileController::class, 'destroy'])->where('path', '.*');
});