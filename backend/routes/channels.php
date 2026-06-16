<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
 * Private channel for per-tenant push notifications.
 * Authorises any authenticated user whose tenant_id matches the channel
 * segment, plus superadmins.
 */
Broadcast::channel('tenant.{tenantId}', function (User $user, string $tenantId) {
    return $user->isSuperadmin() || (string) $user->tenant_id === (string) $tenantId;
});

/*
 * Per-user private channel for personal toasts (assignments, payments
 * received, mentions, …). Only the user themselves — or a superadmin for
 * support purposes — may subscribe.
 */
Broadcast::channel('user.{userId}', function (User $user, string $userId) {
    return $user->isSuperadmin() || (string) $user->id === (string) $userId;
});

/*
 * Superadmin-only firehose for the global control-panel dashboard. Anything
 * broadcast here (tenant created/suspended/subscription changed, signup
 * events, etc.) lights up the SuperAdmin SPA in real time.
 */
Broadcast::channel('superadmin', function (User $user) {
    return $user->isSuperadmin();
});