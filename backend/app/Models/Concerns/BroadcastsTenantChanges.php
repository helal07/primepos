<?php

namespace App\Models\Concerns;

use App\Events\TenantResourceChanged;

/**
 * Drop-in trait that fires a `TenantResourceChanged` event after every
 * create / update / delete, on the `private(tenant.{id})` channel.
 *
 * The model must define a static `broadcastResource(): string` returning
 * the REST slug the SPA listens for (e.g. "warranty_claims").
 *
 * Broadcast failures are swallowed — the SPA's slow-poll safety net
 * still picks the change up.
 */
trait BroadcastsTenantChanges
{
    public static function bootBroadcastsTenantChanges(): void
    {
        static::created(fn ($m) => static::fireBroadcast($m, 'created'));
        static::updated(fn ($m) => static::fireBroadcast($m, 'updated'));
        static::deleted(fn ($m) => static::fireBroadcast($m, 'deleted'));
    }

    protected static function fireBroadcast($model, string $action): void
    {
        if (empty($model->tenant_id)) return;
        try {
            event(new TenantResourceChanged(
                (string) $model->tenant_id,
                static::broadcastResource(),
                $action,
                (string) $model->getKey(),
            ));
        } catch (\Throwable) {
            // best-effort
        }
    }
}