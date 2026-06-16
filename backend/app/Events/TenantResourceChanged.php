<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Generic tenant-scoped change ping. The SPA listens for
 * `.tenant.resource.changed` on `private(tenant.{id})` and invalidates
 * the matching React-Query keys (dashboard stats, sale lists, etc.).
 *
 * Payload deliberately carries no row data — listeners refetch through
 * their existing REST endpoints so authorization stays in one place.
 */
class TenantResourceChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $tenantId,
        public string $resource,
        public string $action,
        public ?string $id = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('tenant.' . $this->tenantId)];
    }

    public function broadcastAs(): string
    {
        return 'tenant.resource.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'resource' => $this->resource,
            'action'   => $this->action,
            'id'       => $this->id,
        ];
    }
}