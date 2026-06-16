<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Generic broadcast on the `private(superadmin)` channel. Listeners on the
 * control-panel SPA invalidate the matching React-Query keys to refresh
 * tenant lists, subscription tables, signup feeds, etc.
 *
 * Payload is intentionally tiny — listeners refetch via existing REST
 * endpoints so authorization stays in one place.
 */
class SuperadminEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $resource,
        public string $action,
        public ?string $id = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('superadmin')];
    }

    public function broadcastAs(): string
    {
        return 'superadmin.event';
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