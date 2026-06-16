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