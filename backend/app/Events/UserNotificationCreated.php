<?php

namespace App\Events;

use App\Models\TenantNotification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast on the per-user private channel `user.{user_id}` when a
 * notification is targeted at a specific user. The SPA's NotificationBell
 * listens for `.user.notification` and triggers an instant toast + refetch.
 *
 * Tenant-wide announcements continue to use `TenantNotificationCreated`.
 */
class UserNotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public TenantNotification $notification)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('user.' . $this->notification->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'user.notification';
    }

    public function broadcastWith(): array
    {
        $n = $this->notification;
        return [
            'id'         => $n->id,
            'tenant_id'  => $n->tenant_id,
            'user_id'    => $n->user_id,
            'type'       => $n->type,
            'title'      => $n->title,
            'message'    => $n->message,
            'channel'    => $n->channel,
            'created_at' => optional($n->created_at)->toIso8601String(),
        ];
    }
}