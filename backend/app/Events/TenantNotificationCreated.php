<?php

namespace App\Events;

use App\Models\TenantNotification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast over the private `tenant.{tenant_id}` channel whenever a new
 * TenantNotification row is created. The SPA's NotificationBell listens for
 * `.tenant.notification` and refetches the notifications list immediately,
 * replacing the 30s polling fallback.
 */
class TenantNotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public TenantNotification $notification)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('tenant.' . $this->notification->tenant_id)];
    }

    public function broadcastAs(): string
    {
        return 'tenant.notification';
    }

    public function broadcastWith(): array
    {
        $n = $this->notification;
        return [
            'id'         => $n->id,
            'tenant_id'  => $n->tenant_id,
            'type'       => $n->type,
            'title'      => $n->title,
            'message'    => $n->message,
            'channel'    => $n->channel,
            'created_at' => optional($n->created_at)->toIso8601String(),
        ];
    }
}