<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\BroadcastsTenantChanges;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    use HasUuids, BelongsToTenant, BroadcastsTenantChanges;

    public static function broadcastResource(): string { return 'leave_requests'; }

    protected $table = 'leave_requests';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];

    protected $casts = [
        'end_date' => 'date',
        'start_date' => 'date',
    ];

    public function employee(): BelongsTo { return $this->belongsTo(Employee::class, 'employee_id'); }
}